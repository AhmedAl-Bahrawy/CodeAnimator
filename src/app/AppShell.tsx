import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden"
      data-ui-skin="midnight"
    >
      <TopBar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
