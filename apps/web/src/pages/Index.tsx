import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };

    checkAuth();
  }, [navigate]);

  //this is just a test

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Il primo sito per le tue jam di AcroYoga</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Trova e organizza{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              jam di AcroYoga
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Jamia semplifica la gestione dei tuoi eventi AcroYoga con prenotazioni intelligenti,
            liste d'attesa bilanciate per ruolo e notifiche automatiche.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={() => navigate("/auth?mode=signup")}
              size="lg"
              className="rounded-xl text-lg h-14 px-8"
            >
              Inizia ora
            </Button>
            <Button
              onClick={() => navigate("/auth?mode=login")}
              variant="outline"
              size="lg"
              className="rounded-xl text-lg h-14 px-8"
            >
              Accedi
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card border border-primary/10 rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Crea Jam in Secondi</h3>
            <p className="text-muted-foreground">
              Imposta data, luogo, capacità e ruoli desiderati. Jamia gestisce tutto il resto.
            </p>
          </div>

          <div className="bg-card border border-primary/10 rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Gestione Ruoli Intelligente</h3>
            <p className="text-muted-foreground">
              Liste d'attesa bilanciate automaticamente tra Base e Flyer per jam equilibrate.
            </p>
          </div>

          <div className="bg-card border border-primary/10 rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Notifiche Automatiche</h3>
            <p className="text-muted-foreground">
              Email di conferma, promossi dalla lista d'attesa e aggiornamenti in tempo reale.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 pb-32">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center text-white space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto a organizzare la tua prima jam?
          </h2>
          <p className="text-lg opacity-90">
            Unisciti alla community Jamia e semplifica l'organizzazione dei tuoi eventi AcroYoga
          </p>
          <Button
            onClick={() => navigate("/auth?mode=signup")}
            size="lg"
            variant="secondary"
            className="rounded-xl text-lg h-14 px-8 bg-white text-primary hover:bg-white/90"
          >
            Registrati gratuitamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;