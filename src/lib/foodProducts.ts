import { fetchProductByBarcode, type OpenFoodFactsProduct } from './openFoodFacts';
import { supabase } from './supabase';

interface FoodProductRow {
  barcode: string;
  name: string;
  brand: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
}

function fromRow(row: FoodProductRow): OpenFoodFactsProduct {
  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
  };
}

async function getCachedProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const { data, error } = await supabase.from('food_products').select('*').eq('barcode', barcode).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as FoodProductRow) : null;
}

async function cacheProduct(product: OpenFoodFactsProduct): Promise<void> {
  const { error } = await supabase.from('food_products').upsert({
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    calories_per_100g: product.caloriesPer100g,
    protein_per_100g: product.proteinPer100g,
    carbs_per_100g: product.carbsPer100g,
    fat_per_100g: product.fatPer100g,
    fetched_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * Looks up a barcode, preferring the shared Supabase cache over Open Food
 * Facts — the whole point being to keep repeat lookups (a product every
 * gym-goer already scanned once) off the 15 req/min OFF rate limit. A cache
 * miss falls through to the network and populates the cache for next time.
 * Returns `null` (not an error) when OFF genuinely has no data for this
 * barcode — never cached, since OFF's community data can fill that gap
 * later.
 */
export async function fetchProductWithCache(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const cached = await getCachedProduct(barcode);
  if (cached) return cached;

  const fromNetwork = await fetchProductByBarcode(barcode);
  if (!fromNetwork) return null;

  await cacheProduct(fromNetwork);
  return fromNetwork;
}
