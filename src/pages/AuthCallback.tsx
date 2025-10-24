import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const next = searchParams.get("next") ?? "/dashboard";
    const code = searchParams.get("code");
    const nextPath = next.startsWith("/") ? next : "/dashboard";

    let failureTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    let isActive = true;

    const cleanup = () => {
      isActive = false;
      if (failureTimer) {
        clearTimeout(failureTimer);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };

    const redirectToAuth = (message?: string) => {
      if (message) {
        toast({
          title: "Errore",
          description: message,
          variant: "destructive",
        });
      }
      cleanup();
      navigate("/auth", { replace: true });
    };

    const redirectToNext = () => {
      cleanup();
      navigate(nextPath, { replace: true });
    };

    if (error) {
      console.error(errorDescription);
      redirectToAuth(errorDescription || "Accesso con Google non riuscito.");
      return () => cleanup();
    }

    if (!code) {
      redirectToAuth("Parametro di autenticazione mancante nella risposta di Google.");
      return () => cleanup();
    }

    const init = async () => {
      const { data: initialSession } = await supabase.auth.getSession();
      if (!isActive) return;

      if (initialSession.session) {
        redirectToNext();
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isActive) return;

        if (event === "SIGNED_IN" && session) {
          redirectToNext();
        } else if (event === "SIGNED_OUT") {
          redirectToAuth();
        }
      });

      unsubscribe = () => subscription.unsubscribe();

      failureTimer = setTimeout(async () => {
        if (!isActive) return;

        const { data: finalSession } = await supabase.auth.getSession();
        if (finalSession.session) {
          redirectToNext();
        } else {
          redirectToAuth("Accesso con Google non completato. Riprova.");
        }
      }, 8000);
    };

    void init();

    return () => cleanup();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default AuthCallback;
