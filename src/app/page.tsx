import { AppProvider } from "@/components/app/app-provider";
import { AppShell } from "@/components/app/app-shell";
import { PwaProvider } from "@/components/app/pwa-provider";

export default function Home() {
  return (
    <PwaProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </PwaProvider>
  );
}
