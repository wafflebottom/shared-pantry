// Probe: King Soopers Atlas search API from a home IP.
// The search page is a shell; products come from this Atlas endpoint
// (captured from Simon's DevTools). The probe's /search?k=eggs never
// executed a search — the real search URL is /search?query=eggs.
// Tests a ladder: bare -> + search-page cookies -> + visitor/channel
// headers -> + full captured headers.
// Run: npx tsx scripts/probe-king-soopers-atlas.ts

import { writeFileSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TIMEOUT_MS = 30_000;

const ATLAS_URL =
  "https://www.kingsoopers.com/atlas/v1/search/v1/products-search?option.groupBy=PRODUCT_VARIANT&option.quickFacets=true&filter.locationId=62000115&filter.query=eggs&filter.fulfillmentMethods=IN_STORE&filter.fulfillmentMethods=PICKUP&filter.fulfillmentMethods=DELIVERY&page.offset=0&page.size=24&option.personalization=PURCHASE_HISTORY";

const SEARCH_PAGE =
  "https://www.kingsoopers.com/search?query=eggs&searchType=default_search";

// x-laf-object captured from Simon's DevTools. Store: Union Station King
// Soopers, 1950 Chestnut Pl, Denver 80202, locationId 62000115,
// facilityId 13050. The UUIDs inside (assortmentKeys, geo id) may expire.
const LAF_OBJECT =
  '[{"modality":{"type":"PICKUP","handoffLocation":{"storeId":"62000115","facilityId":"13050"},"handoffAddress":{"address":{"addressLines":["1950 Chestnut Pl"],"cityTown":"Denver","name":"Union Station","postalCode":"80202","stateProvince":"CO","residential":false,"countryCode":"US"},"location":{"lat":39.757185,"lng":-104.998818}}},"sources":[{"storeId":"62000115","facilityId":"13050"}],"assortmentKeys":["7dadd62c-31bf-48c2-996d-90ff9fbb0c01"],"listingKeys":["62000115"]}]';
const GEO_LOCATION =
  '{"id":"c479b861-887d-47c6-8ff5-138956bd2976","proxyStore":"62000991"}';

async function fetchAtlas(
  label: string,
  extraHeaders: Record<string, string>,
  cookieHeader?: string
) {
  console.log(`\n=== ${label} ===`);
  try {
    const res = await fetch(ATLAS_URL, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        ...extraHeaders,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    console.log("status:", res.status, "| bytes:", text.length);
    console.log("first 400 chars:", JSON.stringify(text.slice(0, 400)));
    console.log("has 'Vital Farms':", text.includes("Vital Farms"));
    console.log(
      "dollar amounts ($X.XX):",
      (text.match(/\$\d+\.\d{2}/g) || []).length
    );
    console.log('count of "price":', (text.match(/"price"/gi) || []).length);
    if (res.status === 200 && text.includes("Vital Farms")) {
      writeFileSync("ks-atlas-eggs.json", text);
      console.log("saved ks-atlas-eggs.json");
    }
    return text;
  } catch (err) {
    console.log("FETCH FAILED:", err instanceof Error ? err.message : err);
    return "";
  }
}

async function main() {
  await fetchAtlas("1. bare (UA only)", {});

  // Mint a session by fetching the real search page first.
  const pageRes = await fetch(SEARCH_PAGE, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const cookies = pageRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  console.log(
    "\nsearch page status:",
    pageRes.status,
    "| cookies harvested:",
    pageRes.headers.getSetCookie().length
  );
  await pageRes.text();

  await fetchAtlas("2. + search-page cookies", {}, cookies);

  const visitorId = crypto.randomUUID();
  await fetchAtlas(
    "3. + cookies + visitor/channel headers",
    { "kroger-visitor-id": visitorId, "x-kroger-channel": "WEB" },
    cookies
  );

  await fetchAtlas(
    "4. + cookies + full captured headers",
    {
      "kroger-visitor-id": visitorId,
      "x-kroger-channel": "WEB",
      "x-laf-object": LAF_OBJECT,
      "x-geo-location-v1": GEO_LOCATION,
    },
    cookies
  );
}

main();
