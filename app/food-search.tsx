import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { FoodLogForm, type FoodLogFormDraft } from '@/components/FoodLogForm';
import { searchProductsByName, type OpenFoodFactsProduct } from '@/lib/openFoodFacts';
import { canSearchNow } from '@/lib/searchThrottle';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function draftFromProduct(product: OpenFoodFactsProduct): FoodLogFormDraft {
  return {
    barcode: product.barcode,
    name: product.name,
    per100g:
      product.caloriesPer100g !== null && product.proteinPer100g !== null && product.carbsPer100g !== null && product.fatPer100g !== null
        ? {
            caloriesPer100g: product.caloriesPer100g,
            proteinPer100g: product.proteinPer100g,
            carbsPer100g: product.carbsPer100g,
            fatPer100g: product.fatPer100g,
          }
        : null,
  };
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const { isOnline } = useSyncStatus();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [draft, setDraft] = useState<FoodLogFormDraft | null>(null);
  const lastSearchAt = useRef<number | null>(null);

  async function runSearch() {
    const trimmed = query.trim();
    if (trimmed === '') return;
    const now = Date.now();
    // Search only ever fires here — on explicit submit — never per keystroke; this additionally
    // guards against a rapid double-submit landing two requests within OFF's 10 req/min limit.
    if (!canSearchNow(lastSearchAt.current, now)) return;
    lastSearchAt.current = now;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      setResults(await searchProductsByName(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zoeken mislukt.');
    } finally {
      setIsSearching(false);
    }
  }

  if (!isOnline) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Geen verbinding</Text>
        <Text style={styles.body}>Zoeken naar producten vereist een internetverbinding. Probeer het later opnieuw.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeLink}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Zoeken</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeButton}>Sluiten</Text>
        </Pressable>
      </View>

      {draft ? (
        <ScrollView contentContainerStyle={styles.content}>
          <FoodLogForm
            draft={draft}
            onLogged={() => router.back()}
            onCancel={() => setDraft(null)}
          />
        </ScrollView>
      ) : (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              placeholder="Productnaam..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
            />
            <Pressable style={styles.searchButton} onPress={runSearch} disabled={isSearching || query.trim() === ''}>
              <Text style={styles.searchButtonText}>Zoeken</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {isSearching && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}
            {!isSearching && error && <Text style={styles.error}>{error}</Text>}
            {!isSearching && !error && hasSearched && results.length === 0 && (
              <EmptyState title="Niets gevonden" body="Probeer een andere zoekterm, of voeg het product handmatig toe." />
            )}
            {!isSearching && !error && hasSearched && results.length === 0 && (
              <Pressable style={styles.manualLink} onPress={() => setDraft({ barcode: null, name: query.trim(), per100g: null })}>
                <Text style={styles.manualLinkText}>Handmatig toevoegen</Text>
              </Pressable>
            )}
            {results.map((product) => (
              <Pressable key={product.barcode} style={styles.resultRow} onPress={() => setDraft(draftFromProduct(product))}>
                <Text style={styles.resultName}>{product.name}</Text>
                <Text style={styles.resultDetail}>
                  {product.brand ? `${product.brand} · ` : ''}
                  {product.caloriesPer100g !== null ? `${Math.round(product.caloriesPer100g)} kcal/100g` : 'Voedingswaarden onbekend'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  closeLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  manualLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  manualLinkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  resultRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  resultName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  resultDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
