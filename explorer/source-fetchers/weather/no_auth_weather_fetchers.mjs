import { runCli } from "./common_functions/index.mjs";
import { runClimateAirReferenceRawFetch } from "./climate_air_reference_fetcher.mjs";
import { runGdacsRawFetch } from "./gdacs_fetcher.mjs";
import { runNasaGibsRawFetch } from "./nasa_gibs_fetcher.mjs";
import { runNoaaCycloneRawFetch } from "./noaa_cyclone_fetcher.mjs";
import { runNoaaDartRawFetch } from "./noaa_dart_fetcher.mjs";
import { runNoaaGoesRawFetch } from "./noaa_goes_fetcher.mjs";
import { runNoaaMarineRawFetch } from "./noaa_marine_fetcher.mjs";
import { runNoaaNoddGfsRawFetch } from "./noaa_nodd_gfs_fetcher.mjs";
import { runNoaaNwpsRawFetch } from "./noaa_nwps_fetcher.mjs";
import { runNoaaNwsRawFetch } from "./noaa_nws_fetcher.mjs";
import { runNoaaRadarRawFetch } from "./noaa_radar_fetcher.mjs";
import { runNoaaSpcRawFetch } from "./noaa_spc_fetcher.mjs";
import { runOpenMeteoRawFetch } from "./open_meteo_fetcher.mjs";
import { runRainViewerRawFetch } from "./rainviewer_fetcher.mjs";
import { runReferenceContextRawFetch } from "./reference_context_fetcher.mjs";
import { runSmithsonianGvpRawFetch } from "./smithsonian_gvp_fetcher.mjs";
import { runUsgsEarthquakeRawFetch } from "./usgs_earthquake_fetcher.mjs";
import { runUsgsVolcanoRawFetch } from "./usgs_volcano_fetcher.mjs";
import { runUsgsWaterRawFetch } from "./usgs_water_fetcher.mjs";
import { runWorldPopRawFetch } from "./worldpop_fetcher.mjs";

const RUNNERS = [
  runOpenMeteoRawFetch,
  runNoaaNwsRawFetch,
  runNoaaNoddGfsRawFetch,
  runNasaGibsRawFetch,
  runNoaaGoesRawFetch,
  runRainViewerRawFetch,
  runNoaaRadarRawFetch,
  runNoaaCycloneRawFetch,
  runNoaaSpcRawFetch,
  runNoaaMarineRawFetch,
  runClimateAirReferenceRawFetch,
  runReferenceContextRawFetch,
  runUsgsEarthquakeRawFetch,
  runUsgsWaterRawFetch,
  runNoaaNwpsRawFetch,
  runNoaaDartRawFetch,
  runSmithsonianGvpRawFetch,
  runUsgsVolcanoRawFetch,
  runGdacsRawFetch,
  runWorldPopRawFetch,
];

export async function runNoAuthWeatherRawFetchers() {
  const results = [];
  for (const runner of RUNNERS) {
    results.push(...(await runner()));
  }
  return results;
}

runCli(import.meta.url, "no_auth_weather", runNoAuthWeatherRawFetchers);
