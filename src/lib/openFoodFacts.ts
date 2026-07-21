import { supabase } from './supabase';

/**
 * Client for the `food-proxy` Supabase Edge Function — never calls Open
 * Food Facts directly. A direct browser `fetch()` to world.openfoodfacts.org
 * fails on the deployed web build with "Failed to fetch": it's a
 * cross-origin request OFF doesn't grant this origin CORS for, and the
 * descriptive `User-Agent` header OFF's API guidelines ask for is a
 * browser-forbidden header anyway (silently dropped, so even a request
 * that got through wouldn't have been spec-compliant). Routing through our
 * own Edge Function (`supabase/functions/food-proxy`) fixes both: the
 * browser only ever talks to our own Supabase project, and the
 * `User-Agent` is set server-side, where it actually takes effect.
 *
 * `supabase.functions.invoke()` handles the auth header and CORS-safe
 * origin automatically (same client already used for every other Supabase
 * call in this app). The function returns Open Food Facts' own response
 * shape unchanged, so the parsing below is identical to when this file
 * used to call OFF directly.
 */

export interface OpenFoodFactsProduct {
  barcode: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
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

async function invokeFoodProxy<T>(payload: { type: 'product'; barcode: string } | { type: 'search'; query: string }): Promise<T> {
  const { data, error } = await supabase.functions.invoke('food-proxy', { body: payload });
  if (error) throw new Error('Zoeken lukte niet, probeer het opnieuw.');
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

/**
 * Looks up a single product by barcode. Returns `null` (not an error) when
 * Open Food Facts doesn't have the barcode (`status: 0`) — the caller falls
 * back to manual entry rather than showing a hard failure.
 */
export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const body = await invokeFoodProxy<{ status: number; product?: Record<string, unknown> }>({ type: 'product', barcode });
  if (body.status === 0 || !body.product) return null;
  return parseProduct(barcode, body.product);
}

/**
 * Full-text search by product name. Callers must NOT call this per
 * keystroke: debounce/explicit-search is the UI's responsibility (see
 * `searchThrottle.ts`), this function does no throttling of its own — the
 * edge function it calls does no server-side throttling either (see
 * PROJECT.md for why: a distributed edge runtime can't reliably rate-limit
 * across instances, so this relies on the existing per-client throttle plus
 * the shared `food_products` cache to keep OFF traffic down).
 */
export async function searchProductsByName(query: string): Promise<OpenFoodFactsProduct[]> {
  const trimmed = query.trim();
  if (trimmed === '') return [];

  const body = await invokeFoodProxy<{ products?: Array<Record<string, unknown>> }>({ type: 'search', query: trimmed });
  return (body.products ?? [])
    .filter((raw): raw is Record<string, unknown> & { code: string } => typeof raw.code === 'string' && raw.code !== '')
    .map((raw) => parseProduct(raw.code, raw));
}
