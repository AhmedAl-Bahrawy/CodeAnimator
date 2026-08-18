import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: ReactNode;
  topBar?: ReactNode;
}

export function AppShell({ children, topBar }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {topBar || <TopBar />}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
