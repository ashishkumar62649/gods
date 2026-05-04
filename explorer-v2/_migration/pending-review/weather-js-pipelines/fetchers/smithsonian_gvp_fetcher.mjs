import { runCli, runFeedList } from "./common_functions/index.mjs";
import { COMMON_FEED_OPTIONS, NO_AUTH_LIMITS, sourceExpected } from "./config/no_auth_source_manifest.mjs";

const GVP_OPTIONS = {
  ...COMMON_FEED_OPTIONS,
  source: "smithsonian_gvp",
  rateLimitPerMin: 10,
  timeoutMs: 20000,
};

const FEEDS = [
  {
    ...GVP_OPTIONS,
    folder: "weekly_reports",
    dataType: "weekly_report_html",
    url: process.env.SMITHSONIAN_GVP_WEEKLY_HTML_URL || "https://volcano.si.edu/reports_weekly.cfm",
    expected: sourceExpected("smithsonian_gvp", "Smithsonian/USGS weekly volcanic activity report HTML."),
    expectedFormat: "html",
    extension: "html",
    expectedLimitBytes: NO_AUTH_LIMITS.referenceHtml,
  },
  {
    ...GVP_OPTIONS,
    folder: "weekly_reports",
    dataType: "weekly_report_rss",
    url: process.env.SMITHSONIAN_GVP_WEEKLY_RSS_URL || "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml",
    expected: sourceExpected("smithsonian_gvp", "Smithsonian/USGS weekly volcanic activity RSS feed."),
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: NO_AUTH_LIMITS.smallXml,
  },
  {
    ...GVP_OPTIONS,
    folder: "weekly_reports",
    dataType: "weekly_report_cap",
    url: process.env.SMITHSONIAN_GVP_WEEKLY_CAP_URL || "https://volcano.si.edu/news/WeeklyVolcanoCAP.xml",
    expected: sourceExpected("smithsonian_gvp", "Smithsonian/USGS weekly volcanic activity CAP XML feed."),
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: NO_AUTH_LIMITS.smallXml,
  },
  {
    ...GVP_OPTIONS,
    folder: "volcano_reference",
    dataType: "holocene_volcano_list_html",
    url: process.env.SMITHSONIAN_GVP_HOLOCENE_HTML_URL || "https://volcano.si.edu/volcanolist_holocene.cfm",
    expected: sourceExpected("smithsonian_gvp", "Smithsonian Holocene Volcano List HTML reference page."),
    expectedFormat: "html",
    extension: "html",
    expectedLimitBytes: NO_AUTH_LIMITS.referenceHtml,
  },
  {
    ...GVP_OPTIONS,
    folder: "volcano_reference",
    dataType: "holocene_volcano_list_excel_xml",
    url: process.env.SMITHSONIAN_GVP_HOLOCENE_XML_URL || "https://volcano.si.edu/database/list_volcano_holocene_excel.cfm",
    expected: sourceExpected("smithsonian_gvp", "Smithsonian Holocene Volcano List XML Excel export."),
    expectedFormat: "xml",
    extension: "xml",
    expectedLimitBytes: NO_AUTH_LIMITS.mediumXml,
  },
];

export async function runSmithsonianGvpRawFetch() {
  return runFeedList(FEEDS);
}

runCli(import.meta.url, "smithsonian_gvp", runSmithsonianGvpRawFetch);
