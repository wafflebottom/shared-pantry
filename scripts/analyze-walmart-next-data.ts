// Analyze the saved Walmart search pages: find the product data inside
// __NEXT_DATA__ and print the JSON path + sample products with prices.
// This confirms the exact shape the adapter would parse.
// Run: npx tsx scripts/analyze-walmart-next-data.ts

import { readFileSync } from "node:fs";

// Tolerant match: any <script> tag whose opening tag mentions __NEXT_DATA__,
// whatever the attribute order or extra attributes are.
function extractNextData(html: string): { data: any } | { error: string } {
  const m = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    const idx = html.indexOf("__NEXT_DATA__");
    const context =
      idx === -1
        ? "(string __NEXT_DATA__ not present at all)"
        : JSON.stringify(html.slice(Math.max(0, idx - 200), idx + 300));
    return { error: `no script tag matched; context around first occurrence: ${context}` };
  }
  try {
    return { data: JSON.parse(m[1]) };
  } catch (err) {
    return {
      error: `JSON parse failed: ${err instanceof Error ? err.message : err} | captured chars: ${m[1].length} | head: ${JSON.stringify(m[1].slice(0, 200))} | tail: ${JSON.stringify(m[1].slice(-200))}`,
    };
  }
}

// An array looks like products if its first element is an object with a
// string "name" and some price-ish field.
function looksLikeProducts(arr: any[]): boolean {
  if (arr.length === 0) return false;
  const first = arr[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return false;
  if (typeof first.name !== "string") return false;
  return (
    typeof first.price === "number" ||
    typeof first.price === "string" ||
    (first.priceInfo && typeof first.priceInfo === "object") ||
    typeof first.currentPrice === "number" ||
    typeof first.priceString === "string"
  );
}

function findProductArrays(
  node: any,
  path: string,
  depth: number,
  out: { path: string; length: number }[]
) {
  if (depth > 8 || out.length >= 5) return;
  if (Array.isArray(node)) {
    if (looksLikeProducts(node)) {
      out.push({ path, length: node.length });
      return; // don't recurse into a product array's items
    }
    // Only walk the first few elements — enough to find nested structure.
    node.slice(0, 3).forEach((child, i) => {
      if (child && typeof child === "object")
        findProductArrays(child, `${path}[${i}]`, depth + 1, out);
    });
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      if (child && typeof child === "object")
        findProductArrays(child, path ? `${path}.${key}` : key, depth + 1, out);
    }
  }
}

function priceOf(item: any): unknown {
  if (typeof item.price === "number" || typeof item.price === "string")
    return item.price;
  if (item.priceInfo?.currentPrice?.price !== undefined)
    return item.priceInfo.currentPrice.price;
  if (typeof item.currentPrice === "number") return item.currentPrice;
  if (typeof item.priceString === "string") return item.priceString;
  return "(no price field found)";
}

function resolvePath(root: any, path: string): any {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let node: any = root;
  for (const p of parts) node = node?.[p];
  return node;
}

function analyzeFile(file: string, detailed: boolean) {
  console.log(`\n=== ${file} ===`);
  const html = readFileSync(file, "utf-8");
  console.log("html bytes:", html.length);
  const result = extractNextData(html);
  if ("error" in result) {
    console.log("EXTRACT FAILED:", result.error);
    return;
  }
  const data = result.data;
  console.log("top-level keys:", Object.keys(data));
  const pageProps = data.props?.pageProps;
  console.log("pageProps keys:", pageProps ? Object.keys(pageProps) : "(none)");
  const found: { path: string; length: number }[] = [];
  findProductArrays(data, "", 0, found);
  console.log("product arrays found:", found.length);
  for (const f of found) {
    console.log(`  path: ${f.path} | items: ${f.length}`);
  }
  if (found.length > 0 && detailed) {
    const arr = resolvePath(data, found[0].path);
    if (Array.isArray(arr) && arr.length > 0) {
      console.log("first item keys:", Object.keys(arr[0]));
      console.log(`\nfirst ${Math.min(10, arr.length)} products:`);
      arr.slice(0, 10).forEach((item: any, i: number) => {
        console.log(
          `  ${i + 1}. ${item.name} | price: ${JSON.stringify(priceOf(item))} | brand: ${item.brand ?? "(none)"}`
        );
      });
    }
  }
}

analyzeFile("wm-search-eggs.html", true);
analyzeFile("wm-search-milk.html", false);
