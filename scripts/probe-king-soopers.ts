// Probe: King Soopers storefront from a home IP.
// The VM can't reach kingsoopers.com at all (connection opens, then zero
// bytes back — Kroger's edge drops datacenter traffic). This checks whether
// a plain fetch works from a residential IP, and whether product data is
// embedded in the search-page HTML or behind an internal API.
// Run: npx tsx scripts/probe-king-soopers.ts

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
      "set-cookie:",
      res.headers.getSetCookie().map((c) => c.split(";")[0].slice(0, 80))
    );
    console.log("count of 'price':", (text.match(/price/gi) || []).length);
    console.log("count of '$':", (text.match(/\$/g) || []).length);
    console.log(
      "dollar amounts ($X.XX):",
      (text.match(/\$\d+\.\d{2}/g) || []).length
    );
    console.log("has __NEXT_DATA__:", text.includes("__NEXT_DATA__"));
    console.log("has 'Vital Farms':", text.includes("Vital Farms"));
    console.log("has 'atlas':", text.includes("atlas"));
    const scripts = [...text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
      (m) => m[1]
    );
    console.log("script srcs (" + scripts.length + "):", scripts.slice(0, 20));
    return { status: res.status, text };
  } catch (err) {
    console.log("FETCH FAILED:", err instanceof Error ? err.message : err);
    return { status: 0, text: "" };
  }
}

async function main() {
  const home = await fetchPage("https://www.kingsoopers.com/", "homepage");
  if (home.text) writeFileSync("ks-home.html", home.text);

  let search = await fetchPage(
    "https://www.kingsoopers.com/search?k=eggs",
    "search 'eggs'"
  );
  if (search.status === 404) {
    console.log("search URL 404'd — trying the alternate search path");
    search = await fetchPage(
      "https://www.kingsoopers.com/products/search?query=eggs",
      "search 'eggs' (alt path)"
    );
  }
  if (search.text) writeFileSync("ks-search-eggs.html", search.text);

  const milk = await fetchPage(
    "https://www.kingsoopers.com/search?k=milk",
    "search 'milk'"
  );
  if (milk.text) writeFileSync("ks-search-milk.html", milk.text);

  console.log(
    "\nSaved ks-home.html, ks-search-eggs.html, ks-search-milk.html (if fetched)"
  );
}

main();
