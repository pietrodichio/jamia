import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profilesApi } from "@/api/profiles.api";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const isProfileComplete = (profile: any): boolean => {
      return !!(
        profile?.first_name?.trim() && 
        profile?.phone?.trim()
      );
    };
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const next = searchParams.get("next") ?? "/dashboard";
    const code = searchParams.get("code");
    
    // Check for jam URL in localStorage as fallback
    const jamUrl = localStorage.getItem('jamia_redirect_url');
    const nextPath = next.startsWith("/") ? next : (jamUrl || "/dashboard");
    
    // Clean up the stored jam URL after using it
    if (jamUrl) {
      localStorage.removeItem('jamia_redirect_url');
    }

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

    const redirectToNext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if profile is complete
          try {
            const profile = await profilesApi.getProfile(user.id);
            if (!isProfileComplete(profile)) {
              // Profile incomplete - redirect to profile setup and preserve jam URL
              if (nextPath.startsWith('/jam/')) {
                localStorage.setItem('jamia_redirect_url', nextPath);
              }
              cleanup();
              navigate("/profile-setup", { replace: true });
              return;
            }
          } catch (error) {
            // Profile doesn't exist or error fetching - redirect to profile setup
            if (nextPath.startsWith('/jam/')) {
              localStorage.setItem('jamia_redirect_url', nextPath);
            }
            cleanup();
            navigate("/profile-setup", { replace: true });
            return;
          }
        }
        
        // Profile is complete or not a jam redirect - proceed normally
        cleanup();
        navigate(nextPath, { replace: true });
      } catch (error) {
        console.error('Error checking profile:', error);
        cleanup();
        navigate(nextPath, { replace: true });
      }
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
