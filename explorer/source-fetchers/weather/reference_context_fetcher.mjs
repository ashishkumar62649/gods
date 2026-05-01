import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS } from "./config/no_auth_source_manifest.mjs";

const SOURCE = "reference_context";

const OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: SOURCE,
  rateLimitPerMin: 20,
  timeoutMs: 30000,
};

const OVERPASS_QUERY = `[out:json][timeout:25];
(
  node(around:1000,22.5726,88.3639)[amenity=hospital];
  node(around:1000,22.5726,88.3639)[amenity=school];
  way(around:1000,22.5726,88.3639)[building];
  way(around:2000,22.5726,88.3639)[power=line];
  node(around:2000,22.5726,88.3639)[power=substation];
);
out center 25;`;

function buildFeeds() {
  return [
    {
      ...OPTIONS,
      folder: "osm",
      dataType: "kolkata_critical_context_sample",
      url: process.env.OVERPASS_CONTEXT_SAMPLE_URL || `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(OVERPASS_QUERY)}`,
      expected: "OpenStreetMap/Overpass sample for hospitals, schools, buildings, power lines/substations, and critical local context. Docs: https://wiki.openstreetmap.org/wiki/Overpass_API",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.mediumJson,
      rateLimitPerMin: 5,
    },
    {
      ...OPTIONS,
      folder: "openfema",
      dataType: "disaster_declarations_sample",
      url: process.env.OPENFEMA_DISASTER_DECLARATIONS_URL || "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=5&$format=json",
      expected: "OpenFEMA disaster declaration sample for historical disaster/declaration context. Docs: https://www.fema.gov/about/openfema/api",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "usgs_hydro_reference",
      dataType: "watershed_boundary_sample",
      url: process.env.USGS_WBD_SAMPLE_URL || "https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/3/query?where=1%3D1&outFields=*&f=json&resultRecordCount=5",
      expected: "USGS/National Map watershed boundary sample for watershed/drainage context. Docs: https://hydro.nationalmap.gov/",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "usgs_faults",
      dataType: "quaternary_faults_sample",
      url: process.env.USGS_FAULTS_SAMPLE_URL || "https://services2.arcgis.com/OCysFFatYM3MITwS/arcgis/rest/services/Quaternary_Faults/FeatureServer/0/query?where=1%3D1&outFields=*&f=json&resultRecordCount=5",
      expected: "USGS Quaternary Faults feature sample for earthquake fault-line context. Docs: https://www.usgs.gov/programs/earthquake-hazards/faults",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "soilgrids",
      dataType: "kolkata_soil_properties_sample",
      url: process.env.SOILGRIDS_SAMPLE_URL || "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=88.3639&lat=22.5726&property=clay&property=sand&property=silt&depth=0-5cm&value=mean",
      expected: "ISRIC SoilGrids point sample for soil type/soil erosion model inputs. Docs: https://rest.isric.org/soilgrids/v2.0/docs",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "terrain",
      dataType: "srtm_elevation_sample",
      url: process.env.OPENTOPO_SRTM_SAMPLE_URL || "https://api.opentopodata.org/v1/srtm90m?locations=37.7749,-122.4194",
      expected: "SRTM elevation point sample for terrain elevation, slope/aspect, and exposure model inputs. Docs: https://www.opentopodata.org/",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "nasa_cmr_reference",
      dataType: "lis_lightning_collections",
      url: process.env.NASA_CMR_LIS_URL || "https://cmr.earthdata.nasa.gov/search/collections.json?keyword=NASA%20LIS&page_size=3",
      expected: "NASA CMR collection search for LIS lightning products; proves catalog source for lightning strike/density rows.",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "nasa_cmr_reference",
      dataType: "viirs_night_lights_collections",
      url: process.env.NASA_CMR_NIGHT_LIGHTS_URL || "https://cmr.earthdata.nasa.gov/search/collections.json?keyword=VIIRS%20night%20lights&page_size=3",
      expected: "NASA CMR collection search for VIIRS night lights products; proves catalog source for night-light rows.",
      expectedFormat: "json",
      extension: "json",
      expectedLimitBytes: NO_AUTH_LIMITS.smallJson,
    },
    {
      ...OPTIONS,
      folder: "faa_nas",
      dataType: "airport_status_information",
      url: process.env.FAA_NAS_STATUS_URL || "https://nasstatus.faa.gov/api/airport-status-information",
      expected: "FAA NAS airport status XML sample for U.S. airport delay/closure context. Docs: https://nasstatus.faa.gov/",
      expectedFormat: "xml",
      extension: "xml",
      expectedLimitBytes: NO_AUTH_LIMITS.smallXml,
    },
  ];
}

export async function runReferenceContextRawFetch() {
  return runFeedList(buildFeeds());
}

runCli(import.meta.url, SOURCE, runReferenceContextRawFetch);
