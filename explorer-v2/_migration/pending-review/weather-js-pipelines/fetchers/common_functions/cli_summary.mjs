import { pathToFileURL } from "node:url";

export function isDirectCli(importMetaUrl, argv = process.argv) {
  return Boolean(argv[1] && importMetaUrl === pathToFileURL(argv[1]).href);
}

export function summarizeResults(results) {
  return results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
}

export function printRunSummary(source, results) {
  console.log(JSON.stringify({ source, counts: summarizeResults(results), results }, null, 2));
}

export function runCli(importMetaUrl, source, runner) {
  if (!isDirectCli(importMetaUrl)) return;
  runner()
    .then((results) => printRunSummary(source, results))
    .catch((error) => {
      console.error(`${source} raw fetcher crashed`, error);
      process.exitCode = 1;
    });
}