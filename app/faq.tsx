import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { FAQ_CATEGORIES, FAQ_ENTRIES, searchFaqEntries, type FaqCategory, type FaqEntry } from '@/lib/faqContent';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function FaqCard({ entry, isExpanded, onToggle }: { entry: FaqEntry; isExpanded: boolean; onToggle: () => void }) {
  return (
    <Card style={styles.faqCard}>
      <Pressable style={styles.faqHeaderRow} onPress={onToggle}>
        <Text style={styles.faqQuestion}>{entry.vraag}</Text>
        {isExpanded ? <ChevronUpIcon size={18} color={colors.textSecondary} /> : <ChevronDownIcon size={18} color={colors.textSecondary} />}
      </Pressable>

      {isExpanded && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{entry.antwoord}</Text>

          <Text style={styles.faqSectionLabel}>Wat betekent dit voor jou in de app?</Text>
          <Text style={styles.faqAppNote}>{entry.watBetekentDitInDeApp}</Text>

          <Text style={styles.faqSectionLabel}>Bronnen</Text>
          {entry.bronnen.map((source) => (
            <Pressable key={source.url} onPress={() => Linking.openURL(source.url)} style={styles.sourceRow}>
              <Text style={styles.sourceText}>
                {source.auteurs} ({source.jaar}) — {source.titel}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function FaqScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openId?: string }>();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(typeof params.openId === 'string' ? [params.openId] : []),
  );

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeButton}>Sluiten</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Wetenschap</Text>
        <Text style={styles.subtitle}>Waarom de app werkt zoals hij werkt — met de onderzoeken erachter.</Text>

        <Card style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            Dit is educatieve informatie, geen medisch advies. Individuele resultaten kunnen variëren.
          </Text>
        </Card>

        <TextInput
          style={styles.searchInput}
          placeholder="Zoek in de FAQ..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.categoryRow}>
          <Pressable style={[styles.categoryChip, selectedCategory === null && styles.categoryChipSelected]} onPress={() => setSelectedCategory(null)}>
            <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextSelected]}>Alle</Text>
          </Pressable>
          {FAQ_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextSelected]}>{category}</Text>
            </Pressable>
          ))}
        </View>

        {visibleEntries.length === 0 && <Text style={styles.emptyText}>Geen vragen gevonden voor deze zoekopdracht.</Text>}

        {visibleEntries.map((entry) => (
          <FaqCard key={entry.id} entry={entry} isExpanded={expandedIds.has(entry.id)} onToggle={() => toggle(entry.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    paddingTop: 32,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: spacing.sm,
  },
  disclaimerCard: {
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
  },
  disclaimerText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: colors.accent,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  faqCard: {
    gap: spacing.xs,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.md,
  },
  faqBody: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  faqAnswer: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  faqSectionLabel: {
    ...typography.label,
    marginTop: spacing.md,
  },
  faqAppNote: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  sourceRow: {
    paddingVertical: spacing.xs,
  },
  sourceText: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
});
