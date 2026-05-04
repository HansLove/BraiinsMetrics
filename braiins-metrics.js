import axios from "axios";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

dotenv.config();

const API_KEY = process.env.BRAIINS_API_KEY;
const BASE_URL = (process.env.BRAIINS_BASE_URL || "https://hashpower.braiins.com").replace(/\/+$/, "");
const REPORT_JSON = path.join(process.cwd(), "braiins-report.json");
const PRICING_MD = path.join(process.cwd(), "braiins-pricing.md");

if (!API_KEY) {
  throw new Error("Missing BRAIINS_API_KEY in .env");
}

/** Braiins gateway expects the literal `apikey` header (not Bearer) for JSON routes. */
function createAuthClient(baseURL) {
  return axios.create({
    baseURL: baseURL.replace(/\/+$/, ""),
    timeout: 15000,
    headers: {
      apikey: API_KEY,
      Accept: "application/json",
    },
  });
}

const specClient = createAuthClient(BASE_URL);

async function getOpenApiSpec() {
  const res = await specClient.get("/api/openapi.yml", {
    headers: { Accept: "application/yaml,text/yaml,*/*" },
  });

  return YAML.parse(res.data);
}

function normalizeBaseUrl(u) {
  if (!u || typeof u !== "string") return null;
  const t = u.trim().replace(/\/+$/, "");
  return t || null;
}

/** OpenAPI 3 `servers` or Swagger 2 `schemes` + `host` + `basePath`. */
function collectServerUrls(spec) {
  if (Array.isArray(spec?.servers) && spec.servers.length) {
    return spec.servers.map((s) => normalizeBaseUrl(s?.url)).filter(Boolean);
  }

  const host = spec?.host;
  if (host && typeof host === "string") {
    const rawBasePath = typeof spec?.basePath === "string" ? spec.basePath : "";
    const basePath =
      rawBasePath === "" ? "" : rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`;
    const schemes =
      Array.isArray(spec?.schemes) && spec.schemes.length ? spec.schemes : ["https"];
    return schemes.map((sch) => normalizeBaseUrl(`${sch}://${host}${basePath}`));
  }

  return [];
}

function pickApiBaseFromSpec(spec) {
  const urls = collectServerUrls(spec);
  if (!urls.length) return null;

  const prefer = urls.find((u) => {
    const l = u.toLowerCase();
    return l.includes("api") || l.includes("webapi");
  });
  return prefer || urls[0];
}

/**
 * Published OpenAPI lists `.../api/v1` while the live Kong routes for spot are under `.../v1`.
 * Only rewrite this suffix; explicit `BRAIINS_API_BASE_URL` is left untouched.
 */
function normalizeGatewayApiRootFromSpecUrl(url) {
  const u = normalizeBaseUrl(url);
  if (!u) return u;
  if (/\/api\/v1$/i.test(u)) return u.replace(/\/api\/v1$/i, "/v1");
  return u;
}

function normalizeSpotPrefix(p) {
  if (p === undefined || p === null || String(p).trim() === "") return "";
  let s = String(p).trim();
  if (!s.startsWith("/")) s = `/${s}`;
  return s.replace(/\/+$/, "");
}

function joinSpotBase(apiRoot, spotPrefix) {
  const root = normalizeBaseUrl(apiRoot) || "";
  const pref = normalizeSpotPrefix(spotPrefix);
  if (!pref) return root;
  return `${root}${pref}`;
}

function findPath(spec, keywords) {
  const paths = Object.keys(spec.paths || {});

  return paths.find((path) =>
    keywords.every((keyword) =>
      path.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

/**
 * GET a path with the given client and return data suitable for JSON parsers plus HTTP diagnostics.
 * If the body is HTML (SPA fallback), `data` is null so analyzers do not treat markup as market data.
 */
async function fetchEndpoint(httpClient, resourcePath, params = {}) {
  if (!resourcePath) {
    return {
      path: null,
      params,
      httpStatus: null,
      contentType: null,
      data: null,
      rawType: null,
      looksLikeHtml: false,
      looksLikeJson: false,
      error: "missing_path",
      bodyPreview: null,
    };
  }

  try {
    const res = await httpClient.get(resourcePath, { params });
    const contentType = String(res.headers["content-type"] || "");
    const raw = res.data;

    let looksLikeHtml = /text\/html/i.test(contentType);
    if (!looksLikeHtml && typeof raw === "string") {
      const head = raw.trimStart().slice(0, 120).toLowerCase();
      if (head.startsWith("<!doctype") || head.startsWith("<html")) looksLikeHtml = true;
    }

    const looksLikeJson =
      !looksLikeHtml &&
      raw !== null &&
      (typeof raw === "object" || Array.isArray(raw));

    let bodyPreview = null;
    if (typeof raw === "string") {
      bodyPreview = raw.slice(0, 500).replace(/\s+/g, " ").trim();
      if (raw.length > 500) bodyPreview += "…";
    } else if (looksLikeJson) {
      const s = JSON.stringify(raw);
      bodyPreview = s.slice(0, 500);
      if (s.length > 500) bodyPreview += "…";
    }

    const data = looksLikeHtml ? null : raw;

    return {
      path: resourcePath,
      params,
      httpStatus: res.status,
      contentType,
      data,
      rawType: raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw,
      looksLikeHtml,
      looksLikeJson,
      error: null,
      bodyPreview,
    };
  } catch (err) {
    const status = err.response?.status ?? null;
    const ct = err.response?.headers?.["content-type"];
    const payload = err.response?.data;
    let bodyPreview = null;
    if (typeof payload === "string") {
      bodyPreview = payload.slice(0, 500).replace(/\s+/g, " ").trim();
      if (payload.length > 500) bodyPreview += "…";
    } else if (payload && typeof payload === "object") {
      try {
        const s = JSON.stringify(payload);
        bodyPreview = s.slice(0, 500) + (s.length > 500 ? "…" : "");
      } catch {
        bodyPreview = String(payload);
      }
    }

    return {
      path: resourcePath,
      params,
      httpStatus: status,
      contentType: ct ? String(ct) : null,
      data: null,
      rawType: null,
      looksLikeHtml: false,
      looksLikeJson: false,
      error: typeof payload === "string" ? payload : err.message,
      bodyPreview,
    };
  }
}

function stripDiagnosticsForJson(full) {
  const { data, ...rest } = full;
  return rest;
}

function satsToBtc(sats) {
  return Number(sats || 0) / 100_000_000;
}

function analyzeOrderBook(orderBook, settings) {
  const bids = orderBook?.bids || orderBook?.buy || [];
  const asks = orderBook?.asks || orderBook?.sell || [];

  const bestBid = bids[0];
  const bestAsk = asks[0];

  const getPrice = (x) => Number(x?.price_sat ?? x?.price ?? 0);
  const getHashrate = (x) =>
    Number(x?.hr_matched_ph ?? x?.hr_available_ph ?? x?.hr ?? x?.hashrate ?? x?.amount ?? 0);

  const bestBidSats = getPrice(bestBid);
  const bestAskSats = getPrice(bestAsk);

  const spreadSats = bestAskSats && bestBidSats ? bestAskSats - bestBidSats : null;
  const midSats = bestAskSats && bestBidSats ? (bestAskSats + bestBidSats) / 2 : null;

  return {
    unit: settings?.hr_unit || "unknown",
    bestBidSats,
    bestAskSats,
    bestBidBTC: satsToBtc(bestBidSats),
    bestAskBTC: satsToBtc(bestAskSats),
    spreadSats,
    spreadBTC: spreadSats ? satsToBtc(spreadSats) : null,
    midPriceSats: midSats,
    midPriceBTC: midSats ? satsToBtc(midSats) : null,
    visibleBidLevels: bids.length,
    visibleAskLevels: asks.length,
    visibleBidHashrate: bids.reduce((sum, x) => sum + getHashrate(x), 0),
    visibleAskHashrate: asks.reduce((sum, x) => sum + getHashrate(x), 0),
  };
}

function analyzeTrades(trades) {
  const list = Array.isArray(trades)
    ? trades
    : trades?.trades || trades?.items || trades?.data || [];

  const prices = list
    .map((t) => Number(t.price_sat ?? t.price ?? 0))
    .filter(Boolean);

  if (!prices.length) {
    return {
      tradesCount: 0,
      avgTradePriceSats: null,
      minTradePriceSats: null,
      maxTradePriceSats: null,
    };
  }

  const sum = prices.reduce((a, b) => a + b, 0);

  return {
    tradesCount: prices.length,
    avgTradePriceSats: sum / prices.length,
    avgTradePriceBTC: satsToBtc(sum / prices.length),
    minTradePriceSats: Math.min(...prices),
    maxTradePriceSats: Math.max(...prices),
  };
}

function computeUsdBenchmarks({ usdPerPHDay }) {
  return {
    usdPerPHDay,
    usdPerPHHour: usdPerPHDay / 24,
    usdPer100THDay: usdPerPHDay * 0.1,
    usdPer100THHour: (usdPerPHDay / 24) * 0.1,
    usdPer10THHour: (usdPerPHDay / 24) * 0.01,
  };
}

function previewChartBars(chartBars) {
  if (chartBars === null || chartBars === undefined) return null;
  if (Array.isArray(chartBars)) return chartBars.slice(0, 3);
  if (typeof chartBars === "object") return Object.keys(chartBars).slice(0, 15);
  return String(chartBars).slice(0, 200);
}

function fmtNum(n, digits = 4) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function satsToBtcStr(sats) {
  return (Number(sats || 0) / 100_000_000).toFixed(8);
}

async function writePricingMarkdown({
  generatedAt,
  effectiveSpotBaseURL,
  settings,
  orderBook,
  tradesPayload,
  feeData,
  orderBookMetrics,
  tradeMetrics,
  usdBenchmarks,
}) {
  const bids = (orderBook?.bids || []).slice(0, 15);
  const asks = (orderBook?.asks || []).slice(0, 15);
  const tradesList = Array.isArray(tradesPayload)
    ? tradesPayload
    : tradesPayload?.trades || tradesPayload?.items || tradesPayload?.data || [];

  const bidRows = bids
    .map(
      (b) =>
        `| ${fmtNum(b.price_sat, 0)} | ${satsToBtcStr(b.price_sat)} | ${fmtNum(b.hr_matched_ph ?? b.hr_available_ph, 6)} | ${fmtNum(b.amount_sat, 0)} |`
    )
    .join("\n");

  const askRows = asks
    .map(
      (a) =>
        `| ${fmtNum(a.price_sat, 0)} | ${satsToBtcStr(a.price_sat)} | ${fmtNum(a.hr_available_ph ?? a.hr_matched_ph, 6)} |`
    )
    .join("\n");

  const tradeRows = tradesList
    .slice(0, 25)
    .map((t) => `| ${t.timestamp ?? "—"} | ${fmtNum(t.price_sat, 6)} | ${fmtNum(t.volume_m, 6)} |`)
    .join("\n");

  const feeBlock =
    feeData && typeof feeData === "object"
      ? "```json\n" + JSON.stringify(feeData, null, 2) + "\n```"
      : "_No fee payload._";

  const settingsBlock =
    settings && typeof settings === "object"
      ? "```json\n" + JSON.stringify(settings, null, 2) + "\n```"
      : "_No settings payload._";

  const md = `# Braiins Hashpower — spot pricing snapshot

Live values from the Braiins Hashpower **spot** JSON API (same sources as \`braiins-metrics.js\`).

| | |
| --- | --- |
| **Generated (UTC)** | ${generatedAt} |
| **API base** | \`${effectiveSpotBaseURL}\` |
| **Market status** | ${settings?.status ?? "—"} |
| **Price unit (sats)** | Listed as **sats per ${settings?.hr_unit ?? orderBookMetrics?.unit ?? "hashrate unit"}** in the order book |

## Top of book (aggregated)

| Metric | Value |
| --- | ---: |
| Best bid (sats) | ${fmtNum(orderBookMetrics.bestBidSats, 2)} |
| Best bid (BTC) | ${satsToBtcStr(orderBookMetrics.bestBidSats)} |
| Best ask (sats) | ${fmtNum(orderBookMetrics.bestAskSats, 2)} |
| Best ask (BTC) | ${satsToBtcStr(orderBookMetrics.bestAskSats)} |
| Mid (sats) | ${orderBookMetrics.midPriceSats != null ? fmtNum(orderBookMetrics.midPriceSats, 2) : "—"} |
| Spread (sats) | ${orderBookMetrics.spreadSats != null ? fmtNum(orderBookMetrics.spreadSats, 2) : "—"} |
| Visible bid / ask levels | ${orderBookMetrics.visibleBidLevels} / ${orderBookMetrics.visibleAskLevels} |

_Spread = best ask (sats) − best bid (sats). A negative value means the top-of-book bid is above the top-of-book ask (possible with aggregated ladders)._

## Recent trades (sample)

| Time (UTC) | Price (sats) | Volume (_m_ field) |
| --- | ---: | ---: |
${tradeRows || "| — | — | — |"}

_Trade sample size in this file: up to 25 rows. Run \`node braiins-metrics.js\` to refresh._

## Order book — bids (top 15)

| Price (sats) | Price (BTC) | Hashrate (PH, matched/avail) | amount_sat |
| --- | --- | --- | ---: |
${bidRows || "| — | — | — | — |"}

## Order book — asks (top 15)

| Price (sats) | Price (BTC) | Hashrate (PH) |
| --- | --- | --- |
${askRows || "| — | — | — |"}

## Spot fee config

${feeBlock}

## Market settings (raw)

${settingsBlock}

## USD reference benchmarks (manual)

These USD figures are **not** from the API; they mirror the static benchmark in \`braiins-metrics.js\` (Braiins UI / luck reference).

| | |
| --- | ---: |
| USD / PH / day | ${fmtNum(usdBenchmarks.usdPerPHDay, 4)} |
| USD / PH / hour | ${fmtNum(usdBenchmarks.usdPerPHHour, 6)} |
| USD / 100TH / day | ${fmtNum(usdBenchmarks.usdPer100THDay, 4)} |
| USD / 100TH / hour | ${fmtNum(usdBenchmarks.usdPer100THHour, 6)} |
| USD / 10TH / hour | ${fmtNum(usdBenchmarks.usdPer10THHour, 6)} |

---

_Aggregated trade stats in \`braiins-report.json\`: count ${tradeMetrics.tradesCount}, avg ${tradeMetrics.avgTradePriceSats != null ? fmtNum(tradeMetrics.avgTradePriceSats, 4) + " sats" : "—"}._
`;

  await fs.writeFile(PRICING_MD, md, "utf8");
}

async function main() {
  const spec = await getOpenApiSpec();

  const specServerUrls = collectServerUrls(spec);
  const usedEnvOverrides = {
    BRAIINS_API_BASE_URL: Boolean(process.env.BRAIINS_API_BASE_URL?.trim()),
    BRAIINS_SPOT_PREFIX: Boolean(process.env.BRAIINS_SPOT_PREFIX?.trim()),
  };

  const specPickedUrl = pickApiBaseFromSpec(spec);
  const resolvedApiBaseURL =
    normalizeBaseUrl(process.env.BRAIINS_API_BASE_URL) ||
    (specPickedUrl ? normalizeGatewayApiRootFromSpecUrl(specPickedUrl) : null) ||
    BASE_URL;

  const spotPathPrefix = normalizeSpotPrefix(process.env.BRAIINS_SPOT_PREFIX);
  const effectiveSpotBaseURL = joinSpotBase(resolvedApiBaseURL, spotPathPrefix);

  const apiClient = createAuthClient(effectiveSpotBaseURL);

  console.log("API connectivity:", {
    siteBaseURL: BASE_URL,
    specServerUrls,
    resolvedApiBaseURL,
    spotPathPrefix: spotPathPrefix || "(none)",
    effectiveSpotBaseURL,
    usedEnvOverrides,
  });

  const settingsPath = findPath(spec, ["spot", "settings"]);
  const orderBookPath =
    findPath(spec, ["spot", "order", "book"]) ||
    findPath(spec, ["spot", "orderbook"]);
  const tradesPath = findPath(spec, ["spot", "trades"]);
  const chartPath =
    findPath(spec, ["spot", "chart"]) ||
    findPath(spec, ["spot", "bars"]);
  const feePath = findPath(spec, ["spot", "fee"]);

  const discoveredEndpoints = {
    settingsPath,
    orderBookPath,
    tradesPath,
    chartPath,
    feePath,
  };

  console.log("Discovered endpoints:", discoveredEndpoints);

  const settingsFetch = await fetchEndpoint(apiClient, settingsPath);
  const orderBookFetch = await fetchEndpoint(apiClient, orderBookPath);
  const tradesFetch = await fetchEndpoint(apiClient, tradesPath, { limit: 100 });
  const chartFetch = await fetchEndpoint(apiClient, chartPath, { interval: "1h", limit: 24 });
  const feeFetch = await fetchEndpoint(apiClient, feePath);

  const settings = settingsFetch.data;
  const orderBook = orderBookFetch.data;
  const trades = tradesFetch.data;
  const chartBars = chartFetch.data;

  const orderBookMetrics = analyzeOrderBook(orderBook, settings);
  const tradeMetrics = analyzeTrades(trades);

  // Manual market benchmark from Braiins UI / luck page.
  const usdBenchmarks = computeUsdBenchmarks({
    usdPerPHDay: 38,
  });

  const endpointDiagnostics = {
    settings: stripDiagnosticsForJson(settingsFetch),
    orderBook: stripDiagnosticsForJson(orderBookFetch),
    trades: stripDiagnosticsForJson(tradesFetch),
    chartBars: stripDiagnosticsForJson(chartFetch),
    fee: stripDiagnosticsForJson(feeFetch),
  };

  const report = {
    timestamp: new Date().toISOString(),
    source: "Braiins Hashpower API",
    baseURL: BASE_URL,
    siteBaseURL: BASE_URL,
    specServerUrls,
    resolvedApiBaseURL,
    spotPathPrefix: spotPathPrefix || "",
    effectiveSpotBaseURL,
    usedEnvOverrides,
    discoveredEndpoints,
    marketUnit: settings?.hr_unit || "Check /spot/settings",
    orderBookMetrics,
    tradeMetrics,
    usdBenchmarks,
    endpointDiagnostics,
    rawPreview: {
      settings: previewChartBars(settings),
      chartBarsSample: previewChartBars(chartBars),
    },
  };

  await fs.writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");
  console.log(`Wrote ${REPORT_JSON}`);

  await writePricingMarkdown({
    generatedAt: report.timestamp,
    effectiveSpotBaseURL: report.effectiveSpotBaseURL,
    settings,
    orderBook,
    tradesPayload: trades,
    feeData: feeFetch.data,
    orderBookMetrics,
    tradeMetrics,
    usdBenchmarks,
  });
  console.log(`Wrote ${PRICING_MD}`);

  console.dir(report, { depth: null });
}

main().catch((err) => {
  console.error("Fatal error:", err.response?.data || err.message);
  process.exit(1);
});
