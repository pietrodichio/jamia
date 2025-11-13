import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const cooldownKey = useMemo(() => "jamia_resend_email_cooldown", []);

  useEffect(() => {
    const locationState = location.state as { email?: string } | null;
    const locationEmail = locationState?.email?.trim();

    if (locationEmail) {
      setEmail(locationEmail);
    } else {
      const storedEmail = localStorage.getItem("jamia_signup_email");
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

    const initializeCooldown = () => {
      const storedTimestamp = localStorage.getItem(cooldownKey);
      if (!storedTimestamp) return;

      const lastResendAt = Number(storedTimestamp);
      if (!Number.isFinite(lastResendAt)) {
        localStorage.removeItem(cooldownKey);
        return;
      }

      const elapsedSeconds = Math.floor((Date.now() - lastResendAt) / 1000);
      const remaining = Math.max(60 - elapsedSeconds, 0);
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      } else {
        localStorage.removeItem(cooldownKey);
      }
    };

    const getUserEmail = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.debug("Errore nel recupero dell'utente:", error);
        return;
      }

      const sessionEmail = data.user?.email?.trim();
      if (sessionEmail) {
        setEmail(sessionEmail);
      }
    };

    initializeCooldown();
    getUserEmail();

    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
      }
    };
  }, [location.state, cooldownKey]);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      if (cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      return;
    }

    cooldownTimerRef.current = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) {
          localStorage.removeItem(cooldownKey);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldownRemaining, cooldownKey]);

  const handleResendEmail = async () => {
    if (!email || cooldownRemaining > 0) return;

    setIsResending(true);
    try {
      const jamUrl = localStorage.getItem('jamia_redirect_url');
      const redirectTo = jamUrl ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(jamUrl)}` : `${window.location.origin}/`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      toast({
        title: "Email inviata!",
        description: "Controlla la tua casella di posta e la cartella spam.",
      });

      localStorage.setItem(cooldownKey, Date.now().toString());
      setCooldownRemaining(60);
    } catch (error: unknown) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile inviare l'email di conferma",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/auth");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/10 shadow-lg rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Conferma la tua email</CardTitle>
          <CardDescription className="text-base">
            Ti abbiamo inviato un'email di conferma a
          </CardDescription>
          {email && (
            <div className="mt-2 p-3 bg-secondary/20 rounded-lg">
              <span className="font-medium text-primary">{email}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Clicca sul link nell'email per attivare il tuo account</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Non hai ricevuto l'email? Controlla la cartella spam o richiedi un nuovo invio.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={isResending || !email || cooldownRemaining > 0}
              className="w-full rounded-xl"
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cooldownRemaining > 0
                ? `Attendi ${cooldownRemaining}s`
                : "Invia nuovamente l'email"}
            </Button>

            <Button
              variant="outline"
              onClick={handleBackToLogin}
              className="w-full rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna al login
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Dopo aver confermato l'email, potrai completare il tuo profilo e iniziare a usare Jamia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
