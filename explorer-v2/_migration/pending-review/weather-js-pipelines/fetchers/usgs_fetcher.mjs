import { runCli } from "./common_functions/index.mjs";
import { runUsgsEarthquakeRawFetch } from "./usgs_earthquake_fetcher.mjs";
import { runUsgsVolcanoRawFetch } from "./usgs_volcano_fetcher.mjs";
import { runUsgsWaterRawFetch } from "./usgs_water_fetcher.mjs";

export async function runUsgsRawFetch() {
  const results = [];
  results.push(...(await runUsgsEarthquakeRawFetch()));
  results.push(...(await runUsgsWaterRawFetch()));
  results.push(...(await runUsgsVolcanoRawFetch()));
  return results;
}

runCli(import.meta.url, "usgs", runUsgsRawFetch);
