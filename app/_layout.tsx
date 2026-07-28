import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ProfileProvider, useProfile } from '@/lib/profile';
import { colors } from '@/theme/colors';

/**
 * Web only: disables the momentum-scroll rubber-band/bounce effect. Without
 * this, scrolling past the end of a list briefly overshoots and springs
 * back — during that overshoot the browser can paint a sliver of whatever
 * sits behind the scroll container before our content repaints, which on
 * this stack is expo-router's own default (light) screen background, not
 * ours (its theme isn't something app code can override — see PROJECT.md).
 * `overscroll-behavior` is a no-op on elements that aren't themselves
 * scroll containers, so applying it broadly is safe.
 */
function useDisableWebOverscrollBounce() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = '* { overscroll-behavior-y: contain; }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

function RootNavigator() {
  const { session, isLoading: isAuthLoading, isPasswordRecovery } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();

  if (isAuthLoading || (session && isProfileLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {/* A password-recovery link's session is a real session, so this has to be checked ahead of
          (and exclude) the normal `session`-based branches below — otherwise a recovery link would
          route straight into onboarding/tabs instead of prompting for a new password first. */}
      <Stack.Protected guard={isPasswordRecovery}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={!session && !isPasswordRecovery}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !profile && !isPasswordRecovery}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !!profile && !isPasswordRecovery}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/[dayId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history/[dayExerciseId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="week-review" options={{ presentation: 'modal' }} />
        <Stack.Screen name="adjustment-history" options={{ presentation: 'modal' }} />
        <Stack.Screen name="switch-goal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="faq" options={{ presentation: 'modal' }} />
        <Stack.Screen name="readiness" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useDisableWebOverscrollBounce();

  return (
    <AuthProvider>
      <ProfileProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </ProfileProvider>
    </AuthProvider>
  );
}
