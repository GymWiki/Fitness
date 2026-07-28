'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors } from '@/theme/colors';
import { CalendarIcon, HomeIcon, TrendingUpIcon, UserIcon, type IconProps } from './icons';

const TABS: Array<{ href: string; label: string; Icon: (props: IconProps) => React.JSX.Element }> = [
  { href: '/', label: 'Vandaag', Icon: HomeIcon },
  { href: '/schema', label: 'Schema', Icon: CalendarIcon },
  { href: '/progress', label: 'Progressie', Icon: TrendingUpIcon },
  { href: '/profile', label: 'Profiel', Icon: UserIcon },
];

/** Bottom tab bar for the four main app screens — ported from the Expo app's `Tabs` navigator. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-border bg-surface pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
      {TABS.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        const color = isActive ? colors.accent : colors.textSecondary;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-1"
            style={{ color }}
          >
            <Icon size={22} color={color} />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
