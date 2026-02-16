import { supabase } from "./client";

const SIGN_OUT_TIMEOUT_MS = 5000;

function isTransientSignOutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeMessage = "message" in error ? String(error.message ?? "").toLowerCase() : "";
  const maybeStatus = "status" in error ? String(error.status ?? "") : "";

  return (
    maybeStatus === "504" ||
    maybeMessage.includes("gateway timeout") ||
    maybeMessage.includes("timed out") ||
    maybeMessage.includes("timeout") ||
    maybeMessage.includes("network") ||
    maybeMessage.includes("fetch")
  );
}

export async function signOutSafely(): Promise<{ usedLocalFallback: boolean }> {
  try {
    const globalSignOutResult = await Promise.race([
      supabase.auth.signOut(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), SIGN_OUT_TIMEOUT_MS);
      }),
    ]);

    if (globalSignOutResult && !globalSignOutResult.error) {
      return { usedLocalFallback: false };
    }

    if (globalSignOutResult?.error && !isTransientSignOutError(globalSignOutResult.error)) {
      throw globalSignOutResult.error;
    }
  } catch (error) {
    if (!isTransientSignOutError(error)) {
      throw error;
    }
  }

  const localSignOutResult = await supabase.auth.signOut({ scope: "local" });
  if (localSignOutResult.error) {
    throw localSignOutResult.error;
  }

  return { usedLocalFallback: true };
}
