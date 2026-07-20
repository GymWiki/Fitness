import { Tabs } from 'expo-router';
import { CalendarIcon, HomeIcon, TrendingUpIcon, UserIcon, type IconProps } from '@/components/icons';
import { colors } from '@/theme/colors';

function tabIcon(Icon: (props: IconProps) => React.JSX.Element) {
  return ({ color }: { color: string }) => <Icon color={color} size={22} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 8, paddingBottom: 10 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Vandaag', tabBarIcon: tabIcon(HomeIcon) }} />
      <Tabs.Screen name="schema" options={{ title: 'Schema', tabBarIcon: tabIcon(CalendarIcon) }} />
      <Tabs.Screen name="progress" options={{ title: 'Progressie', tabBarIcon: tabIcon(TrendingUpIcon) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profiel', tabBarIcon: tabIcon(UserIcon) }} />
    </Tabs>
  );
}
