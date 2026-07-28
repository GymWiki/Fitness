import { describe, expect, it } from 'vitest';
import { FAQ_CATEGORIES, FAQ_ENTRIES, searchFaqEntries } from './faqContent';

describe('FAQ_ENTRIES content', () => {
  it('has at least one source for every entry', () => {
    for (const entry of FAQ_ENTRIES) {
      expect(entry.bronnen.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('assigns every entry a category from FAQ_CATEGORIES — never a stray/misspelled value', () => {
    for (const entry of FAQ_ENTRIES) {
      expect(FAQ_CATEGORIES).toContain(entry.category);
    }
  });

  it('gives every category at least one entry, so no filter tab is ever empty', () => {
    for (const category of FAQ_CATEGORIES) {
      expect(FAQ_ENTRIES.some((entry) => entry.category === category)).toBe(true);
    }
  });

  it('gives every source a non-empty title, author, year and a well-formed https url', () => {
    for (const entry of FAQ_ENTRIES) {
      for (const source of entry.bronnen) {
        expect(source.titel.length).toBeGreaterThan(0);
        expect(source.auteurs.length).toBeGreaterThan(0);
        expect(source.jaar).toBeGreaterThan(1900);
        expect(source.url.startsWith('https://')).toBe(true);
      }
    }
  });

  it('has unique, non-empty ids', () => {
    const ids = FAQ_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });
});

describe('searchFaqEntries', () => {
  it('returns everything for an empty query', () => {
    expect(searchFaqEntries(FAQ_ENTRIES, '')).toHaveLength(FAQ_ENTRIES.length);
    expect(searchFaqEntries(FAQ_ENTRIES, '   ')).toHaveLength(FAQ_ENTRIES.length);
  });

  it('matches case-insensitively against the question text', () => {
    const results = searchFaqEntries(FAQ_ENTRIES, 'SUPERCOMPENSATIE');
    expect(results.some((entry) => entry.id === 'supercompensatie')).toBe(true);
  });

  it('matches against the answer body, not just the question', () => {
    const results = searchFaqEntries(FAQ_ENTRIES, 'mTOR');
    expect(results.some((entry) => entry.id === 'progressive-overload')).toBe(true);
  });

  it('returns an empty list for a query matching nothing', () => {
    expect(searchFaqEntries(FAQ_ENTRIES, 'xyznonexistentquery')).toEqual([]);
  });
});
