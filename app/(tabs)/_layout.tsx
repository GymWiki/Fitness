import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarIcon, HomeIcon, TrendingUpIcon, UserIcon, UtensilsIcon, type IconProps } from '@/components/icons';
import { colors } from '@/theme/colors';

// Icon + label + baseline breathing room on a device with NO bottom safe-area
// inset (old iPhone home button, Android 3-button nav). The home-indicator /
// gesture-bar inset gets added on top of this, not squeezed into it — that
// squeeze (a fixed height that never grew with the inset) was why labels got
// clipped on devices with a gesture bar.
const BASE_TAB_BAR_HEIGHT = 58;
const BASE_BOTTOM_PADDING = 10;

function tabIcon(Icon: (props: IconProps) => React.JSX.Element) {
  return ({ color }: { color: string }) => <Icon color={color} size={22} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: BASE_TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: BASE_BOTTOM_PADDING + insets.bottom,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Vandaag', tabBarIcon: tabIcon(HomeIcon) }} />
      <Tabs.Screen name="schema" options={{ title: 'Schema', tabBarIcon: tabIcon(CalendarIcon) }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Voeding', tabBarIcon: tabIcon(UtensilsIcon) }} />
      <Tabs.Screen name="progress" options={{ title: 'Progressie', tabBarIcon: tabIcon(TrendingUpIcon) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profiel', tabBarIcon: tabIcon(UserIcon) }} />
    </Tabs>
  );
}
