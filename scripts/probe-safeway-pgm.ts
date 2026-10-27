// Probe: Safeway pgmsearch endpoint from a home IP, using the exact request
// Simon captured from the browser. The browser's live search uses pgmsearch
// (not plain search/products or the Bloomreach proxy), with extra params
// the VM probe didn't send (pgm, timezone, channel, wineshopstoreid,
// zipcode, includeOffer, banner) and the PGM subscription key.
// Run: npx tsx scripts/probe-safeway-pgm.ts

import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BASE = "https://www.safeway.com";
const KEY_PGM = "5e790236c84e46338f4290aa1050cdd4";
const TIMEOUT_MS = 30_000;

let cookieJar = "";
function storeCookies(res: Response) {
  const cs = res.headers.getSetCookie();
  if (cs.length) cookieJar = cs.map((c) => c.split(";")[0]).join("; ");
}

async function get(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Cookie: cookieJar, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  storeCookies(res);
  return res;
}

function pgmParams(query: string, storeId: string, zipcode: string) {
  return new URLSearchParams({
    "request-id": `${Date.now()}${Math.floor(1000 + 9000 * Math.random())}`,
    url: "https://www.safeway.com",
    pageurl: "https://www.safeway.com",
    pagename: "search",
    rows: "30",
    start: "0",
    "search-type": "keyword",
    storeid: storeId,
    featured: "true",
    q: query,
    sort: "",
    timezone: "America/Los_Angeles",
    dvid: "web-4.1search",
    channel: "instore",
    wineshopstoreid: "5799",
    zipcode,
    visitorId: randomUUID(),
    pgm: "wineshop,merch-banner",
    includeOffer: "true",
    banner: "safeway",
  }).toString();
}

async function search(query: string, storeId: string, zipcode: string) {
  const referer = `https://www.safeway.com/shop/search-results.html?q=${encodeURIComponent(query)}&tab=products`;
  console.log(`\n=== pgmsearch '${query}' (store ${storeId}, zip ${zipcode}) ===`);
  try {
    const r = await get(
      `${BASE}/abs/pub/xapi/pgmsearch/v1/search/products?${pgmParams(query, storeId, zipcode)}`,
      {
        Accept: "application/json, text/plain, */*",
        "ocp-apim-subscription-key": KEY_PGM,
        Referer: referer,
      }
    );
    const t = await r.text();
    console.log("status:", r.status, "| bytes:", t.length);
    console.log("has 'Vital Farms':", t.includes("Vital Farms"));
    console.log("count of 'price':", (t.match(/price/gi) || []).length);
    console.log("body:", t.slice(0, 500));
    if (r.status === 200 && (t.includes("Vital Farms") || t.includes('"price"'))) {
      writeFileSync(`sw-pgm-${query}.json`, t);
      console.log(`saved sw-pgm-${query}.json`);
      return true;
    }
    return false;
  } catch (err) {
    console.log("ERROR:", err instanceof Error ? err.message : err);
    return false;
  }
}

async function main() {
  const home = await get(BASE + "/");
  console.log(
    "homepage:",
    home.status,
    "| cookies:",
    cookieJar.split("; ").filter(Boolean).length
  );
  await home.text();

  // Use the captured store/zip first: this tests the endpoint, not the store.
  const ok = await search("eggs", "3132", "94611");
  if (ok) await search("milk", "3132", "94611");
  console.log("\nDone.");
}

main();
