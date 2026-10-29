"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function TicketAutoRefresh({ initialVersion }: { initialVersion: string }) {
  const router = useRouter();

  useEffect(() => {
    let version = initialVersion;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch("/api/tickets/updates", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { version?: string };
        if (result.version && result.version !== version) {
          version = result.version;
          router.refresh();
        }
      } catch {
        // Keep the existing page usable during a brief network interruption.
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(() => void check(), 10_000);
    return () => window.clearInterval(timer);
  }, [initialVersion, router]);

  return <span className="ticket-live-status"><RefreshCw size={12} /> Updates automatically every 10 seconds</span>;
}
