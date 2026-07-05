import { ConnectivityProvider } from "@/components/layout/connectivity-provider";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { NavigationProgressProvider } from "@/components/layout/navigation-progress";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <NavigationProgressProvider>
        <OfflineBanner />
        {children}
      </NavigationProgressProvider>
    </ConnectivityProvider>
  );
}
