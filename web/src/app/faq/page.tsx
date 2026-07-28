'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { FAQ_CATEGORIES, FAQ_ENTRIES, searchFaqEntries, type FaqCategory, type FaqEntry } from '@/lib/faqContent';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

function FaqCard({ entry, isExpanded, onToggle }: { entry: FaqEntry; isExpanded: boolean; onToggle: () => void }) {
  return (
    <Card className="flex flex-col gap-1">
      <button type="button" className="flex items-center justify-between text-left" onClick={onToggle}>
        <span className="mr-3 flex-1 text-[15px] font-bold text-text-primary">{entry.vraag}</span>
        {isExpanded ? <ChevronUpIcon size={18} color={colors.textSecondary} /> : <ChevronDownIcon size={18} color={colors.textSecondary} />}
      </button>

      {isExpanded && (
        <div className="mt-2 flex flex-col gap-1">
          <p className="text-sm leading-[21px] text-text-secondary">{entry.antwoord}</p>

          <p className={`${typography.label} mt-2`}>Wat betekent dit voor jou in de app?</p>
          <p className="text-[13px] italic leading-[19px] text-text-secondary">{entry.watBetekentDitInDeApp}</p>

          <p className={`${typography.label} mt-2`}>Bronnen</p>
          {entry.bronnen.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="py-1 text-[13px] leading-[18px] text-accent underline">
              {source.auteurs} ({source.jaar}) — {source.titel}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function FaqPage() {
  const searchParams = useSearchParams();
  const openId = searchParams.get('openId') ?? undefined;

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(openId ? [openId] : []));

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleEntries = useMemo(() => {
    const bySearch = searchFaqEntries(FAQ_ENTRIES, query);
    return selectedCategory ? bySearch.filter((entry) => entry.category === selectedCategory) : bySearch;
  }, [query, selectedCategory]);

  return (
    <div className="min-h-screen bg-background">
      <ModalHeader title="Wetenschap" subtitle="Waarom de app werkt zoals hij werkt — met de onderzoeken erachter." />
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-6">
        <Card className="bg-surface-elevated">
          <p className="text-xs leading-[17px] text-text-secondary">
            Dit is educatieve informatie, geen medisch advies. Individuele resultaten kunnen variëren.
          </p>
        </Card>

        <input
          className="mt-2 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Zoek in de FAQ..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="mb-2 mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-4 py-3 text-[13px] font-semibold ${
              selectedCategory === null ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface text-text-secondary'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            Alle
          </button>
          {FAQ_CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              className={`rounded-full border px-4 py-3 text-[13px] font-semibold ${
                selectedCategory === category ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface text-text-secondary'
              }`}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
            >
              {category}
            </button>
          ))}
        </div>

        {visibleEntries.length === 0 && <EmptyState title="Niets gevonden" body="Probeer een andere zoekterm of kies een andere categorie." />}

        {visibleEntries.map((entry) => (
          <FaqCard key={entry.id} entry={entry} isExpanded={expandedIds.has(entry.id)} onToggle={() => toggle(entry.id)} />
        ))}
      </div>
    </div>
  );
}
