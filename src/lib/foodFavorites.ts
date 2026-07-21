import { supabase } from './supabase';

export interface FoodFavorite {
  id: string;
  barcode: string | null;
  label: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

interface FoodFavoriteRow {
  id: string;
  barcode: string | null;
  label: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

function fromRow(row: FoodFavoriteRow): FoodFavorite {
  return {
    id: row.id,
    barcode: row.barcode,
    label: row.label,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
  };
}

/** Newest first, for the "Favorieten" quick-log row on the Voeding tab. */
export async function fetchFavorites(userId: string): Promise<FoodFavorite[]> {
  const { data, error } = await supabase
    .from('food_favorites')
    .select('id, barcode, label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as FoodFavoriteRow));
}

export interface NewFoodFavorite {
  barcode?: string | null;
  label: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

/** Snapshots the per-100g macros at save time rather than a live reference, so a favorite keeps working even if the product ever drops out of the cache. */
export async function addFavorite(userId: string, favorite: NewFoodFavorite): Promise<void> {
  const { error } = await supabase.from('food_favorites').insert({
    user_id: userId,
    barcode: favorite.barcode ?? null,
    label: favorite.label,
    calories_per_100g: favorite.caloriesPer100g,
    protein_per_100g: favorite.proteinPer100g,
    carbs_per_100g: favorite.carbsPer100g,
    fat_per_100g: favorite.fatPer100g,
  });
  if (error) throw error;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  const { error } = await supabase.from('food_favorites').delete().eq('id', favoriteId);
  if (error) throw error;
}
