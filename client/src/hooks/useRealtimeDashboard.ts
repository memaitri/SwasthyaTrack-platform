import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabaseClient from "@/lib/supabaseClient";

// Tables that impact dashboards and should trigger invalidation
const DASHBOARD_TABLES = [
  "annual_health_cards",
  "monthly_checkups",
  "meal_logs",
  "referrals",
  "students",
];

/**
 * Hook: subscribes to Supabase Postgres changes and invalidates relevant queries
 * to ensure dashboards stay up-to-date in near-real-time.
 */
export function useRealtimeDashboard(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (!supabaseClient) return;

    const channel = supabaseClient.channel("public:dashboards");

    DASHBOARD_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          try {
            // Invalidate headmaster/PO/teacher dashboards and related queries
            queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && ["/api/headmaster/dashboard", "/api/po/dashboard", "/api/teacher/dashboard"].includes(q.queryKey[0] as string) });
            // Also invalidate other potentially related queries (referrals endpoints)
            queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/teacher/referral-tracking" });
          } catch (err) {
            // swallow errors
            console.error("Realtime dashboard invalidation error:", err);
          }
        },
      );
    });

    try {
      const subResult = channel.subscribe();
      // Handle both promise and non-promise return types
      if (subResult && typeof (subResult as any).then === "function") {
        (subResult as any).catch((err: any) => console.warn("Failed to subscribe to Supabase realtime channel:", err));
      } else if ((subResult as any)?.error) {
        console.warn("Failed to subscribe to Supabase realtime channel:", (subResult as any).error);
      }
    } catch (err) {
      console.warn("Failed to subscribe to Supabase realtime channel:", err);
    }

    return () => {
      try {
        const unsub = channel.unsubscribe();
        if (unsub && typeof (unsub as any).then === 'function') {
          (unsub as any).catch((err: any) => console.warn("Failed to unsubscribe from Supabase realtime channel:", err));
        }
      } catch (err) {
        console.warn("Failed to unsubscribe from Supabase realtime channel:", err);
      }
    };
  }, [enabled, queryClient]);
}

export default useRealtimeDashboard;
