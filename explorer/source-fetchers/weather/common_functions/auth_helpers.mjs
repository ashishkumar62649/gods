import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runFeed } from "./feed_runner.mjs";
import { saveFailure } from "./failure_writer.mjs";

export function missingCredentialResult(feed, envVars) {
  const error = new Error(`Missing required credential: ${envVars.join(" or ")}`);
  error.name = "MissingCredentialError";
  error.retryable = false;
  return saveFailure(feed, error, new Date(), { retryCount: 0 });
}

export async function runFeedIfCredential(feed, envVars) {
  const names = Array.isArray(envVars) ? envVars : [envVars];
  if (!names.some((name) => process.env[name])) return missingCredentialResult(feed, names);
  return runFeed(feed);
}

function b64url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

export async function getCopernicusLandAccessToken(credentialsPath) {
  const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
  const required = ["client_id", "key_id", "private_key", "token_uri", "user_id"];
  const missing = required.filter((key) => !credentials[key]);
  if (missing.length) {
    const error = new Error(`CLMS credentials missing fields: ${missing.join(", ")}`);
    error.name = "InvalidCopernicusLandCredentialsError";
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: credentials.key_id };
  const payload = {
    iss: credentials.client_id,
    sub: credentials.user_id,
    aud: credentials.token_uri,
    iat: now,
    exp: now + 300,
  };
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(credentials.private_key, "base64url");
  const assertion = `${signingInput}.${signature}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(credentials.token_uri, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payloadText = await response.text();
  let json = null;
  try {
    json = JSON.parse(payloadText);
  } catch {
    json = null;
  }

  if (!response.ok || !json?.access_token) {
    const error = new Error(`CLMS token exchange failed with HTTP ${response.status}`);
    error.name = "CopernicusLandTokenError";
    error.httpStatus = response.status;
    error.httpStatusText = response.statusText;
    error.responsePreview = payloadText.slice(0, 160);
    throw error;
  }

  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type || "Bearer",
  };
}
