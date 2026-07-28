import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: mockSupabase }));

// In-memory stand-in for AsyncStorage so fetchWithCache's cache reads/writes are exercised
// for real, without pulling in the native module (this test runs under vitest's node env).
const memoryStore = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(memoryStore.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      memoryStore.set(key, value);
      return Promise.resolve();
    }),
  },
}));

// Imported after the mocks so exerciseMedia.ts's internal imports resolve to the mocks above.
const { fetchExerciseMedia } = await import('./exerciseMedia');

const matchedRow = {
  exercise_name: 'Barbell Bench Press',
  media_urls: ['https://example.com/0.jpg', 'https://example.com/1.jpg'],
  tips: ['Houd je schouderbladen samen', 'Voeten stevig op de grond', 'Raak de borst licht aan'],
  source_name: 'free-exercise-db',
  source_url: 'https://github.com/yuhonas/free-exercise-db',
  source_license: 'Unlicense (public domain)',
};

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => Promise.resolve(result);
  return chain;
}

describe('fetchExerciseMedia', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
    memoryStore.clear();
  });

  it('returns media and tips for an exercise with a matched row, including attribution', async () => {
    mockSupabase.from.mockImplementation(() => makeSelectChain({ data: matchedRow, error: null }));

    const media = await fetchExerciseMedia('Barbell Bench Press');

    expect(media).not.toBeNull();
    expect(media?.mediaUrls).toEqual(matchedRow.media_urls);
    expect(media?.tips).toEqual(matchedRow.tips);
    expect(media?.tips.length).toBeGreaterThanOrEqual(2);
    expect(media?.tips.length).toBeLessThanOrEqual(4);
    expect(media?.sourceName).toBe('free-exercise-db');
    expect(media?.sourceLicense).toBe('Unlicense (public domain)');
  });

  it('returns null (clean fallback, no crash) for an exercise with no matched row', async () => {
    mockSupabase.from.mockImplementation(() => makeSelectChain({ data: null, error: null }));

    await expect(fetchExerciseMedia('Nordic Curl (geassisteerd)')).resolves.toBeNull();
  });

  it('serves the cached row when a later call has no network, instead of throwing', async () => {
    mockSupabase.from.mockImplementation(() => makeSelectChain({ data: matchedRow, error: null }));
    const first = await fetchExerciseMedia('Barbell Bench Press');
    expect(first?.mediaUrls).toEqual(matchedRow.media_urls);

    mockSupabase.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(new Error('offline')) }) }),
    }));
    const second = await fetchExerciseMedia('Barbell Bench Press');
    expect(second).toEqual(first);
  });

  it('does not re-fetch a different exercise from the cache entry of another exercise', async () => {
    mockSupabase.from.mockImplementation(() => makeSelectChain({ data: matchedRow, error: null }));
    await fetchExerciseMedia('Barbell Bench Press');

    mockSupabase.from.mockImplementation(() => makeSelectChain({ data: null, error: null }));
    const other = await fetchExerciseMedia('Dumbbell Curl');
    expect(other).toBeNull();
  });
});
