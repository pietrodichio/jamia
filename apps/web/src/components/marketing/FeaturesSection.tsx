import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Sparkles, MapPin, Bell, Heart } from 'lucide-react';

/**
 * Marketing features section for home page
 * Highlights jam management, event creation, and Jamia's mission
 */
export function FeaturesSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-24 py-16">

      {/* Event Creation Features */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Promuovi i tuoi eventi
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Raggiungi la community AcroYoga italiana con i tuoi corsi, workshop e conventions
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card border border-primary/10 rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Visibilità Locale</h3>
            <p className="text-muted-foreground">
              Gli utenti trovano i tuoi eventi cercando nella loro zona. Raggiungi chi è vicino a te.
            </p>
          </div>

          <div className="bg-card border border-primary/10 rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Eventi Ricorrenti</h3>
            <p className="text-muted-foreground">
              Crea corsi settimanali o mensili con un click. Gestisci eccezioni e modifiche facilmente.
            </p>
          </div>

          <div className="bg-card border border-primary/10 rounded-2xl p-8 space-y-4 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Profilo Insegnante</h3>
            <p className="text-muted-foreground">
              Aggiungi i tuoi insegnanti agli eventi. Gli utenti possono scoprire chi insegna e seguirli.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center text-white space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto a organizzare il tuo primo evento?
          </h2>
          <p className="text-lg opacity-90">
            Unisciti alla community Jamia e semplifica l'organizzazione dei tuoi eventi AcroYoga
          </p>
          <Button
            size="lg"
            className="rounded-xl text-lg h-14 px-8 bg-white text-primary hover:bg-white/90"
            onClick={() => navigate('/auth')}
          >
            Registrati gratuitamente
          </Button>
        </div>
      </section>


      {/* Jam Management Features */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Gestisci le tue jam con facilità
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Strumenti pensati per semplificare l'organizzazione delle tue jam di AcroYoga
          </p>
        </div>

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
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Notifiche Automatiche</h3>
            <p className="text-muted-foreground">
              Email di conferma, promossi dalla lista d'attesa e aggiornamenti in tempo reale.
            </p>
          </div>
        </div>
      </section>


      {/* Open Source Mission */}
      <section className="container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/20 px-4 py-2 rounded-full">
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
              Progetto no-profit e open source
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold">
            Costruito dalla community, per la community
          </h2>

          <p className="text-muted-foreground text-lg">
            Jamia è un progetto open source senza scopo di lucro, nato con l'obiettivo di
            far crescere e connettere la community di AcroYoga in Italia. Il codice è disponibile
            su GitHub e chiunque può contribuire.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => window.open('https://github.com/Tambour1/jamia', '_blank')}
            >
              Vedi su GitHub
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
