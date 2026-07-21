/**
 * Thin, read-only client for the Open Food Facts API (https://openfoodfacts.org,
 * ODbL-licensed, no API key required). Two endpoints only, per their docs:
 * - Barcode lookup: v2 product API.
 * - Name search: the older v1 `cgi/search.pl` endpoint — v2 doesn't support
 *   full-text search yet.
 *
 * Rate limits (per OFF's guidance): 15 req/min for product lookups, 10
 * req/min for search. This client does not itself throttle — callers are
 * responsible for that (see the debounced/explicit-search UI, and
 * `foodProducts.ts`'s cache, which is what keeps barcode re-scans off the
 * network entirely).
 *
 * A descriptive User-Agent is sent as OFF requests, though note that browser
 * `fetch` treats `User-Agent` as a forbidden header and silently drops it on
 * web — this only takes effect on native (iOS/Android).
 */
const USER_AGENT = 'AdaptiveFitnessApp/1.0 (Expo React Native; +https://github.com/GymWiki/Fitness)';
const REQUEST_TIMEOUT_MS = 10_000;

export interface OpenFoodFactsProduct {
  barcode: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Data is community-entered and often incomplete — every nutriment field defensively falls back to null rather than throwing. */
function parseNutriments(raw: Record<string, unknown> | undefined): Pick<OpenFoodFactsProduct, 'caloriesPer100g' | 'proteinPer100g' | 'carbsPer100g' | 'fatPer100g'> {
  const nutriments = raw ?? {};
  const readNumber = (key: string): number | null => {
    const value = nutriments[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
  return {
    caloriesPer100g: readNumber('energy-kcal_100g'),
    proteinPer100g: readNumber('proteins_100g'),
    carbsPer100g: readNumber('carbohydrates_100g'),
    fatPer100g: readNumber('fat_100g'),
  };
}

function parseProduct(barcode: string, raw: Record<string, unknown>): OpenFoodFactsProduct {
  const name = typeof raw.product_name === 'string' && raw.product_name.trim() !== '' ? raw.product_name : 'Onbekend product';
  const brand = typeof raw.brands === 'string' && raw.brands.trim() !== '' ? raw.brands : null;
  return {
    barcode,
    name,
    brand,
    ...parseNutriments(raw.nutriments as Record<string, unknown> | undefined),
  };
}

/**
 * Looks up a single product by barcode. Returns `null` (not an error) when
 * Open Food Facts doesn't have the barcode (`status: 0`) — the caller falls
 * back to manual entry rather than showing a hard failure.
 */
export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const response = await fetchWithTimeout(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
  if (!response.ok) throw new Error(`Open Food Facts gaf een fout terug (${response.status}).`);
  const body = (await response.json()) as { status: number; product?: Record<string, unknown> };
  if (body.status === 0 || !body.product) return null;
  return parseProduct(barcode, body.product);
}

const SEARCH_PAGE_SIZE = 20;

/**
 * Full-text search by product name (v1 API — v2 has no search endpoint yet).
 * Callers must NOT call this per keystroke: debounce/explicit-search is the
 * UI's responsibility, this function does no throttling of its own.
 */
export async function searchProductsByName(query: string): Promise<OpenFoodFactsProduct[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(SEARCH_PAGE_SIZE),
  });
  const response = await fetchWithTimeout(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`);
  if (!response.ok) throw new Error(`Open Food Facts gaf een fout terug (${response.status}).`);
  const body = (await response.json()) as { products?: Array<Record<string, unknown>> };

  return (body.products ?? [])
    .filter((raw): raw is Record<string, unknown> & { code: string } => typeof raw.code === 'string' && raw.code !== '')
    .map((raw) => parseProduct(raw.code, raw));
}
