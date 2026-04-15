import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const updateStatus = async (status: string) => {
      await supabase
        .from("profiles")
        .update({ status, last_seen: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    // Set online immediately
    updateStatus("online");

    // Heartbeat every 30s
    intervalRef.current = setInterval(() => {
      updateStatus("online");
    }, 30000);

    // Handle tab visibility
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateStatus("online");
      } else {
        updateStatus("offline");
      }
    };

    // Handle tab/window close
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`;
      const body = JSON.stringify({ status: "offline", last_seen: new Date().toISOString() });
      navigator.sendBeacon(
        url,
        new Blob([body], { type: "application/json" })
      );
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateStatus("offline");
    };
  }, [user]);
}
