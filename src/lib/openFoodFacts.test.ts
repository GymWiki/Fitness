import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: mockInvoke } } }));

// Imported after the mock so this file's internal `import { supabase } from './supabase'` resolves to the mock.
const { fetchProductByBarcode, searchProductsByName } = await import('./openFoodFacts');

describe('fetchProductByBarcode', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('calls the food-proxy edge function with a product request, never Open Food Facts directly', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 1, product: { product_name: 'Kwark', brands: 'Campina', nutriments: { proteins_100g: 11 } } }, error: null });

    await fetchProductByBarcode('1234567890123');

    expect(mockInvoke).toHaveBeenCalledWith('food-proxy', { body: { type: 'product', barcode: '1234567890123' } });
  });

  it('parses a found product from the proxy response', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        status: 1,
        product: { product_name: 'Kwark', brands: 'Campina', nutriments: { 'energy-kcal_100g': 60, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 } },
      },
      error: null,
    });

    const product = await fetchProductByBarcode('1234567890123');

    expect(product).toEqual({
      barcode: '1234567890123',
      name: 'Kwark',
      brand: 'Campina',
      caloriesPer100g: 60,
      proteinPer100g: 11,
      carbsPer100g: 4,
      fatPer100g: 0.2,
    });
  });

  it('returns null (not an error) for a barcode Open Food Facts has no data for', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 0 }, error: null });

    await expect(fetchProductByBarcode('0000000000000')).resolves.toBeNull();
  });

  it('throws a clear Dutch message (not a raw "Failed to fetch") when the edge function itself fails to invoke', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });

    await expect(fetchProductByBarcode('1234567890123')).rejects.toThrow('Zoeken lukte niet, probeer het opnieuw.');
  });

  it('propagates the proxy\'s own error message when it returns one (e.g. an OFF upstream failure)', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Kon het product niet opzoeken. Probeer het opnieuw.' }, error: null });

    await expect(fetchProductByBarcode('1234567890123')).rejects.toThrow('Kon het product niet opzoeken. Probeer het opnieuw.');
  });
});

describe('searchProductsByName', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('calls the food-proxy edge function with a search request, never Open Food Facts directly', async () => {
    mockInvoke.mockResolvedValue({ data: { products: [] }, error: null });

    await searchProductsByName('Kwark');

    expect(mockInvoke).toHaveBeenCalledWith('food-proxy', { body: { type: 'search', query: 'Kwark' } });
  });

  it('parses multiple results from the proxy response', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        products: [
          { code: '111', product_name: 'Magere kwark', nutriments: { proteins_100g: 12 } },
          { code: '222', product_name: 'Volle kwark', nutriments: { proteins_100g: 9 } },
        ],
      },
      error: null,
    });

    const results = await searchProductsByName('Kwark');

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name)).toEqual(['Magere kwark', 'Volle kwark']);
  });

  it('returns a clean empty list for a search with no matches, never a crash', async () => {
    mockInvoke.mockResolvedValue({ data: { products: [] }, error: null });

    await expect(searchProductsByName('xyznonexistentquery')).resolves.toEqual([]);
  });

  it('never calls the proxy for a blank query', async () => {
    const results = await searchProductsByName('   ');
    expect(results).toEqual([]);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('skips results without a barcode instead of crashing on them', async () => {
    mockInvoke.mockResolvedValue({
      data: { products: [{ product_name: 'Geen barcode' }, { code: '333', product_name: 'Wel een barcode' }] },
      error: null,
    });

    const results = await searchProductsByName('test');

    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('Wel een barcode');
  });
});
