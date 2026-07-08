import { ConnectivityProvider } from "@/components/layout/connectivity-provider";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { NavigationProgressProvider } from "@/components/layout/navigation-progress";
import { IdleSessionGuard } from "@/components/auth/idle-session-guard";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <NavigationProgressProvider>
        <IdleSessionGuard />
        <OfflineBanner />
        {children}
      </NavigationProgressProvider>
    </ConnectivityProvider>
  );
}
