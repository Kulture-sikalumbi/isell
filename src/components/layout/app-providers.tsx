import { NavigationProgressProvider } from "@/components/layout/navigation-progress";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <NavigationProgressProvider>{children}</NavigationProgressProvider>;
}
