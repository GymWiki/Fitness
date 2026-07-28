import type { ReactNode } from 'react';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <TabBar />
    </div>
  );
}
