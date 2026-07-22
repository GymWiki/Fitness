import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { FoodLogForm, type FoodLogFormDraft } from '@/components/FoodLogForm';
import { fetchProductWithCache } from '@/lib/foodProducts';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const SCANNED_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function FoodScanScreen() {
  const router = useRouter();
  const { isOnline } = useSyncStatus();
  const [permission, requestPermission] = useCameraPermissions();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FoodLogFormDraft | null>(null);

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (isLookingUp || draft) return;
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const product = await fetchProductWithCache(result.data);
      if (product) {
        setDraft({
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
        });
      } else {
        // status:0 (barcode unknown to Open Food Facts) or missing nutriments — fall back to manual
        // entry. We deliberately don't keep the scanned barcode here: food_logs.barcode is a foreign
        // key into food_products, and nothing was cached for a barcode OFF has no data for.
        setDraft({ barcode: null, name: '', per100g: null });
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Kon het product niet opzoeken.');
    } finally {
      setIsLookingUp(false);
    }
  }

  if (!isOnline) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Geen verbinding</Text>
        <Text style={styles.body}>Barcode scannen vereist een internetverbinding om het product op te zoeken. Probeer het later opnieuw, of voeg handmatig toe.</Text>
        <View style={styles.buttonWrap}>
          <Button variant="secondary" onPress={() => router.back()}>
            Terug
          </Button>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Cameratoegang nodig</Text>
        <Text style={styles.body}>Om barcodes te scannen heeft Adaptive Fitness toegang tot je camera nodig.</Text>
        <View style={styles.buttonWrap}>
          <Button onPress={requestPermission}>Toegang geven</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeButtonWrap}>
          <Text style={styles.closeButton}>Sluiten</Text>
        </Pressable>
      </View>

      {draft ? (
        <ScrollView contentContainerStyle={styles.formContent}>
          <FoodLogForm
            draft={draft}
            onLogged={() => router.back()}
            onCancel={() => {
              setDraft(null);
              setLookupError(null);
            }}
          />
        </ScrollView>
      ) : (
        <>
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: [...SCANNED_BARCODE_TYPES] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.scanFrame} pointerEvents="none" />
          </View>
          <View style={styles.footer}>
            {isLookingUp && <ActivityIndicator color={colors.accent} />}
            {lookupError && <Text style={styles.error}>{lookupError}</Text>}
            {!isLookingUp && !lookupError && <Text style={styles.hint}>Richt de camera op de barcode van het product.</Text>}
          </View>
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
    justifyContent: 'flex-end',
    padding: spacing.xxl,
    paddingBottom: spacing.md,
  },
  closeButtonWrap: {
    minHeight: layout.minTapTarget,
    justifyContent: 'center',
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: spacing.xxl,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  scanFrame: {
    width: '70%',
    height: 140,
    borderColor: colors.accent,
    borderWidth: 2,
    borderRadius: radii.md,
  },
  footer: {
    padding: spacing.xxl,
    alignItems: 'center',
    minHeight: 60,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  formContent: {
    padding: spacing.xxl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  body: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonWrap: {
    marginTop: spacing.md,
    minWidth: 200,
  },
});
