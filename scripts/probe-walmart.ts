// Probe: Walmart storefront from a home IP.
// The VM is blocked by PerimeterX ("Robot or human?" page) on every search
// attempt — cookie replay doesn't help. This checks whether a plain fetch
// works from a residential IP, and captures the store context (Walmart
// prices are per-store; the homepage's __NEXT_DATA__ carries the storeId
// for the IP-derived location).
// Run: npx tsx scripts/probe-walmart.ts

import { writeFileSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TIMEOUT_MS = 30_000;

async function fetchPage(url: string, label: string) {
  console.log(`\n=== ${label}: ${url} ===`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    console.log("status:", res.status, "| final URL:", res.url);
    console.log("bytes:", text.length);
    console.log(
      "blocked page:",
      text.includes("Robot or human") || res.url.includes("/blocked")
    );
    console.log(
      "set-cookie:",
      res.headers.getSetCookie().map((c) => c.split(";")[0].slice(0, 80))
    );
    console.log("has __NEXT_DATA__:", text.includes("__NEXT_DATA__"));
    console.log("count of 'price':", (text.match(/price/gi) || []).length);
    console.log(
      "dollar amounts ($X.XX):",
      (text.match(/\$\d+\.\d{2}/g) || []).length
    );
    // Store context (best effort — the saved HTML has the full blob).
    const storeId = text.match(/"storeId":\s*"?(\d+)"?/);
    if (storeId) console.log("first storeId seen:", storeId[1]);
    const zip = text.match(/"postalCode":\s*"(\d{5})"/);
    if (zip) console.log("first postalCode seen:", zip[1]);
    return { status: res.status, text };
  } catch (err) {
    console.log("FETCH FAILED:", err instanceof Error ? err.message : err);
    return { status: 0, text: "" };
  }
}

async function main() {
  const home = await fetchPage("https://www.walmart.com/", "homepage");
  if (home.text) writeFileSync("wm-home.html", home.text);

  const eggs = await fetchPage(
    "https://www.walmart.com/search?q=eggs",
    "search 'eggs'"
  );
  if (eggs.text) writeFileSync("wm-search-eggs.html", eggs.text);

  const milk = await fetchPage(
    "https://www.walmart.com/search?q=milk",
    "search 'milk'"
  );
  if (milk.text) writeFileSync("wm-search-milk.html", milk.text);

  // Store directory (CO) — lists stores with storeId/postalCode.
  // Also PerimeterX-guarded from the VM.
  console.log("\n=== store directory (CO) ===");
  try {
    const res = await fetch(
      "https://www.walmart.com/store/electrode/api/store-directory?st=CO",
      {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    const text = await res.text();
    console.log("status:", res.status, "| bytes:", text.length);
    console.log("first 400 chars:", JSON.stringify(text.slice(0, 400)));
    if (res.status === 200) writeFileSync("wm-store-directory-co.json", text);
  } catch (err) {
    console.log("FETCH FAILED:", err instanceof Error ? err.message : err);
  }

  console.log(
    "\nSaved wm-home.html, wm-search-eggs.html, wm-search-milk.html, wm-store-directory-co.json (if fetched)"
  );
}

main();
