// Server-side proxy for Open Food Facts. Exists because the app used to
// call world.openfoodfacts.org directly from the browser, which fails with
// "Failed to fetch" on the deployed web build: it's a cross-origin request
// with no CORS grant from OFF for that origin, and the descriptive
// User-Agent OFF asks for is a browser-forbidden header anyway (silently
// dropped client-side, so the integration was never spec-compliant even
// when a request did get through). Routing through this function fixes
// both: the browser only ever talks to our own Supabase project (which
// does grant CORS), and the User-Agent is set here, server-side, where it
// actually takes effect.
//
// Also does the "cache before/after hitting OFF" work described in
// PROJECT.md: a barcode lookup checks `food_products` first and only calls
// OFF on a miss; a search response gets every returned product written
// into that same cache, so a later barcode scan of any of those products
// is already a cache hit. RLS on `food_products` already allows any
// authenticated user to read/write it (it's a shared, non-personal cache
// of public OFF data), so this forwards the caller's own JWT rather than
// reaching for the service-role key — least privilege, same as if the
// client had written the cache row directly.
import { createClient } from 'npm:@supabase/supabase-js@2';

const USER_AGENT = 'AdaptiveFitnessApp/1.0 (Expo React Native; +https://github.com/GymWiki/Fitness)';
const SEARCH_PAGE_SIZE = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ProxyRequest = { type: 'product'; barcode: string } | { type: 'search'; query: string };

interface OffNutriments {
  'energy-kcal_100g'?: unknown;
  proteins_100g?: unknown;
  carbohydrates_100g?: unknown;
  fat_100g?: unknown;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
}

interface CachedProductRow {
  barcode: string;
  name: string;
  brand: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

function errorResponse(message: string, status = 502): Response {
  return jsonResponse({ error: message }, status);
}

/** Forwards the caller's own JWT so `food_products` RLS applies exactly as it would for a direct client write. */
function supabaseClientForRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
}

/** Reconstructs an OFF-shaped product from a cached row, so the client's existing parseProduct() never has to know whether a result came from cache or from OFF directly. */
function offProductFromCacheRow(row: CachedProductRow): OffProduct {
  return {
    code: row.barcode,
    product_name: row.name,
    brands: row.brand ?? undefined,
    nutriments: {
      'energy-kcal_100g': row.calories_per_100g ?? undefined,
      proteins_100g: row.protein_per_100g ?? undefined,
      carbohydrates_100g: row.carbs_per_100g ?? undefined,
      fat_100g: row.fat_per_100g ?? undefined,
    },
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function cacheProduct(supabaseClient: ReturnType<typeof createClient>, product: OffProduct): Promise<void> {
  if (!product.code) return;
  const nutriments = product.nutriments ?? {};
  await supabaseClient.from('food_products').upsert({
    barcode: product.code,
    name: product.product_name?.trim() || 'Onbekend product',
    brand: product.brands?.trim() || null,
    calories_per_100g: numberOrNull(nutriments['energy-kcal_100g']),
    protein_per_100g: numberOrNull(nutriments.proteins_100g),
    carbs_per_100g: numberOrNull(nutriments.carbohydrates_100g),
    fat_per_100g: numberOrNull(nutriments.fat_100g),
    fetched_at: new Date().toISOString(),
  });
}

async function handleProduct(supabaseClient: ReturnType<typeof createClient>, barcode: string): Promise<Response> {
  const trimmed = barcode.trim();
  if (!trimmed) return errorResponse('Barcode ontbreekt.', 400);

  const { data: cached } = await supabaseClient.from('food_products').select('*').eq('barcode', trimmed).maybeSingle();
  if (cached) {
    return jsonResponse({ status: 1, product: offProductFromCacheRow(cached as CachedProductRow) });
  }

  let offResponse: Response;
  try {
    offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmed)}.json`, {
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch {
    return errorResponse('Kon het product niet opzoeken. Probeer het opnieuw.');
  }
  if (!offResponse.ok) return errorResponse('Kon het product niet opzoeken. Probeer het opnieuw.');

  const body = (await offResponse.json()) as { status: number; product?: OffProduct };
  if (body.status === 0 || !body.product) return jsonResponse({ status: 0 });

  await cacheProduct(supabaseClient, body.product);
  return jsonResponse({ status: 1, product: body.product });
}

async function handleSearch(supabaseClient: ReturnType<typeof createClient>, query: string): Promise<Response> {
  const trimmed = query.trim();
  if (!trimmed) return jsonResponse({ products: [] });

  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(SEARCH_PAGE_SIZE),
  });

  let offResponse: Response;
  try {
    offResponse = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
  } catch {
    return errorResponse('Zoeken lukte niet. Probeer het opnieuw.');
  }
  if (!offResponse.ok) return errorResponse('Zoeken lukte niet. Probeer het opnieuw.');

  const body = (await offResponse.json()) as { products?: OffProduct[] };
  const products = Array.isArray(body.products) ? body.products : [];

  // Best-effort: a caching hiccup should never fail the search itself.
  await Promise.allSettled(products.filter((product) => product.code).map((product) => cacheProduct(supabaseClient, product)));

  return jsonResponse({ products });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return errorResponse('Method not allowed.', 405);

  let payload: ProxyRequest;
  try {
    payload = await req.json();
  } catch {
    return errorResponse('Ongeldig verzoek.', 400);
  }

  const supabaseClient = supabaseClientForRequest(req);

  if (payload.type === 'product') return handleProduct(supabaseClient, payload.barcode);
  if (payload.type === 'search') return handleSearch(supabaseClient, payload.query);
  return errorResponse('Onbekend verzoektype.', 400);
});
