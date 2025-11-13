import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const AcceptInvite = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialJamId = searchParams.get("jamId");
  const initialJamName = searchParams.get("jamName");
  const [resolvedJamId, setResolvedJamId] = useState<string | null>(initialJamId);
  const [resolvedJamName, setResolvedJamName] = useState<string | null>(initialJamName);
  const jamPath = resolvedJamId ? `/jam/${resolvedJamId}` : null;

  useEffect(() => {
    console.info("[AcceptInvite] Mounted with params:", {
      initialJamId,
      initialJamName,
      hash: window.location.hash,
    });

    let cancelled = false;

    const clearHash = () => {
      if (window.location.hash) {
        console.info("[AcceptInvite] Clearing hash after session hydration");
        window.history.replaceState(
          {},
          document.title,
          `${window.location.pathname}${window.location.search}`,
        );
      }
    };

    const hydrateSessionFromHash = async () => {
      const hash = window.location.hash;
      if (!hash || !hash.includes("access_token")) {
        console.info("[AcceptInvite] No auth hash present, skipping hydration");
        return;
      }

      const params = new URLSearchParams(hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        console.warn("[AcceptInvite] Auth hash missing tokens", { accessToken, refreshToken });
        return;
      }

      console.info("[AcceptInvite] Hydrating session from hash");
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        throw error;
      }

      clearHash();
    };

    const checkSession = async () => {
      try {
        await hydrateSessionFromHash();
      } catch (error) {
        if (!cancelled) {
          console.error("[AcceptInvite] Session hydration failed", error);
          setSessionError(
            error instanceof Error
              ? error.message
              : "Impossibile validare l'invito. Richiedi un nuovo link.",
          );
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error || !data.session) {
        console.warn("[AcceptInvite] No active session", { error });
        setSessionError("Il link di invito non è più valido. Richiedi un nuovo invito all'organizzatore.");
      } else {
        console.info("[AcceptInvite] Session ready for user", data.session.user?.id);
        const { data: userData } = await supabase.auth.getUser();
        const meta = userData.user?.user_metadata as Record<string, string> | undefined;

        if (meta?.invite_jam_id) {
          console.info("[AcceptInvite] Resolved jamId from metadata", meta.invite_jam_id);
          setResolvedJamId(meta.invite_jam_id);
        }

        if (meta?.invite_jam_name) {
          setResolvedJamName(meta.invite_jam_name);
        }

        setSessionReady(true);
      }
    };

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAcceptInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    console.info("[AcceptInvite] Submit attempt", { jamPath });

    if (password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      if (jamPath) {
        console.info("[AcceptInvite] Storing jam redirect", { jamPath });
        localStorage.setItem("jamia_redirect_url", jamPath);
      }

      toast({
        title: "Password impostata!",
        description: "Ora completa il tuo profilo per confermare la partecipazione.",
      });

      navigate("/profile-setup", { replace: true });
    } catch (error) {
      console.error("[AcceptInvite] Failed to accept invite", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile completare l'invito.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const headline = resolvedJamName
    ? `Benvenuto in Jamia! Sei stato invitato a "${resolvedJamName}".`
    : "Benvenuto in Jamia! Completa il tuo invito.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md border-primary/10 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold text-primary">Jamia</CardTitle>
          <CardDescription className="text-base">
            {sessionError
              ? sessionError
              : sessionReady
              ? headline
              : "Verifichiamo il tuo invito..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionReady ? (
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Imposta una password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conferma e continua
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Dopo aver impostato la password ti guideremo al completamento del profilo e poi alla jam.
              </p>
            </form>
          ) : sessionError ? (
            <div className="space-y-4 text-center">
              <Button className="rounded-xl" onClick={() => navigate("/auth")} variant="outline">
                Torna alla pagina di accesso
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
