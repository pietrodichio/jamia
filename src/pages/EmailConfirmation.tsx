import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Get the current user's email
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email inviata!",
        description: "Controlla la tua casella di posta e la cartella spam.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare l'email di conferma",
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
              disabled={isResending || !email}
              className="w-full rounded-xl"
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invia nuovamente l'email
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
