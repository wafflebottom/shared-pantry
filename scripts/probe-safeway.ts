// Probe: Safeway search APIs from a home IP.
// The VM can't replay either search endpoint (xapi hangs, Bloomreach-proxy
// 404s) — the gate is likely browser-minted cookies / Incapsula. This
// tries both endpoints from a residential IP with a fresh guest session,
// resolving the store ID from the session's userinfo first.
// Run: npx tsx scripts/probe-safeway.ts

import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BASE = "https://www.safeway.com";
const KEY_SEARCH = "e914eec9448c4d5eb672debf5011cf8f";
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

async function main() {
  // 1. Homepage: mint the guest session (Incapsula + ACI_S_UUID).
  const home = await get(BASE + "/");
  console.log(
    "homepage:",
    home.status,
    "| cookies:",
    cookieJar.split("; ").filter(Boolean).length
  );
  await home.text();

  // 2. userinfo: the session's store (branch) ID + zip for this IP.
  let storeId = "";
  try {
    const r = await get(
      `${BASE}/bin/safeway/unified/userinfo?rand=${Date.now()}&banner=safeway`,
      { Accept: "application/json" }
    );
    const t = await r.text();
    console.log("\n=== userinfo ===");
    console.log("status:", r.status, "| body:", t.slice(0, 500));
    try {
      const j = JSON.parse(t);
      storeId = String(j.shopStoreId ?? j.storeId ?? "");
      console.log(
        "storeId:",
        storeId,
        "| zip:",
        j.shopZipcode ?? j.zipcode ?? "(none)"
      );
    } catch {
      console.log("(userinfo body is not JSON)");
    }
  } catch (err) {
    console.log("\nuserinfo ERROR:", err instanceof Error ? err.message : err);
  }
  if (!storeId) {
    console.log("no storeId from userinfo — using the VM default 3132 as a fallback");
    storeId = "3132";
  }

  const visitorId = randomUUID();
  const requestId = `${Date.now()}${Math.floor(1000 + 9000 * Math.random())}`;
  const searchPage = `https://www.safeway.com/shop/search-results.html?k=eggs&loc=${storeId}`;

  // 3. Bloomreach-proxy search (params from the page's own search config).
  const brParams = new URLSearchParams({
    account_id: "6175",
    auth_key: "eyxny75nafpl1ra4",
    domain_key: "albertsons",
    request_id: requestId,
    _br_uid_2: `uid=${visitorId}:v=15.0:ts=${Date.now()}:hc=1`,
    url: "https://www.safeway.com",
    ref_url: searchPage,
    request_type: "search",
    search_type: "keyword",
    q: "eggs",
    fl: "name,aisleId,pid,upc,price,basePrice,pricePer,quantity,quantityOrder,unitOfMeasure",
    rows: "30",
    start: "0",
    sort: "",
    view_id: storeId,
    visitorId,
  });
  try {
    console.log("\n=== Bloomreach-proxy Search_Results ===");
    const r = await get(`${BASE}/api/v1/core/Search_Results?${brParams}`, {
      "ocp-apim-subscription-key": KEY_SEARCH,
      Accept: "application/json",
      Referer: searchPage,
    });
    const t = await r.text();
    console.log("status:", r.status, "| bytes:", t.length, "| body:", t.slice(0, 500));
    if (r.status === 200 && t.includes("Vital Farms")) {
      writeFileSync("sw-search-eggs.json", t);
      console.log("saved sw-search-eggs.json");
    }
  } catch (err) {
    console.log("Bloomreach ERROR:", err instanceof Error ? err.message : err);
  }

  // 4. xapi search/products (same param shape as the VM probe-v9).
  const xapiParams = new URLSearchParams({
    "request-id": requestId,
    url: "https://www.safeway.com",
    pageurl: "https://www.safeway.com",
    pagename: "search",
    rows: "30",
    start: "0",
    "search-type": "keyword",
    storeid: storeId,
    featured: "true",
    q: "eggs",
    sort: "",
    userid: "",
    dvid: "web-4.1search",
    visitorId,
  });
  try {
    console.log("\n=== xapi search/products ===");
    const r = await get(`${BASE}/abs/pub/xapi/search/products?${xapiParams}`, {
      "ocp-apim-subscription-key": KEY_SEARCH,
      Accept: "application/json",
      Referer: searchPage,
    });
    const t = await r.text();
    console.log("status:", r.status, "| bytes:", t.length, "| body:", t.slice(0, 500));
    if (r.status === 200 && t.includes("Vital Farms")) {
      writeFileSync("sw-xapi-eggs.json", t);
      console.log("saved sw-xapi-eggs.json");
    }
  } catch (err) {
    console.log("xapi ERROR:", err instanceof Error ? err.message : err);
  }

  console.log("\nDone.");
}

main();
