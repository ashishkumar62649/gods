import { runCli } from "./common_functions/index.mjs";
import { runCopernicusLandClmsRawFetch } from "./copernicus_land_clms_fetcher.mjs";
import { runNasaEarthdataModisRawFetch } from "./nasa_earthdata_modis_fetcher.mjs";
import { runNasaFirmsRawFetch } from "./nasa_firms_fetcher.mjs";
import { runOpenAqRawFetch } from "./openaq_fetcher.mjs";

const RUNNERS = [
  runNasaFirmsRawFetch,
  runOpenAqRawFetch,
  runCopernicusLandClmsRawFetch,
  runNasaEarthdataModisRawFetch,
];

export async function runAuthWeatherRawFetchers() {
  const results = [];
  for (const runner of RUNNERS) {
    results.push(...(await runner()));
  }
  return results;
}

runCli(import.meta.url, "auth_weather", runAuthWeatherRawFetchers);
