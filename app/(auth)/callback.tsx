import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme/colors';

/**
 * Landing spot for the magic-link redirect. AuthProvider's global Linking
 * listener already extracts the session from the URL; this screen just
 * bridges the moment until Stack.Protected swaps to the (tabs) group.
 */
export default function AuthCallbackScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
