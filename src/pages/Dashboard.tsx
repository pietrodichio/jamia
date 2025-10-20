import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Users, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JamCard from "@/components/JamCard";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myJams, setMyJams] = useState<any[]>([]);
  const [upcomingJams, setUpcomingJams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(profileData);

    if (profileData && !profileData.phone) {
      navigate("/profile-setup");
      return;
    }

    await loadJams(session.user.id);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  };

  const loadJams = async (userId: string) => {
    setIsLoading(true);
    try {
      // Load jams created by user
      const { data: ownedJams, error: ownedError } = await supabase
        .from("jams")
        .select(`
          *,
          jam_participants (
            id,
            state
          )
        `)
        .eq("owner_id", userId)
        .order("starts_at", { ascending: true });

      if (ownedError) throw ownedError;

      // Calculate participant counts
      const jamsWithCounts = (ownedJams || []).map(jam => ({
        ...jam,
        participant_count: jam.jam_participants?.filter((p: any) => p.state === "participant").length || 0,
        waiting_count: jam.jam_participants?.filter((p: any) => p.state === "waiting").length || 0,
      }));

      setMyJams(jamsWithCounts);

      // Load jams user is participating in
      const { data: participations, error: participationsError } = await supabase
        .from("jam_participants")
        .select(`
          *,
          jams (
            *
          )
        `)
        .eq("user_id", userId)
        .in("state", ["participant", "waiting"])
        .order("joined_at", { ascending: false });

      if (participationsError) throw participationsError;

      // Load full jam details for participated jams
      const participatedJamIds = participations?.map(p => p.jam_id) || [];
      if (participatedJamIds.length > 0) {
        const { data: participatedJams, error: participatedError } = await supabase
          .from("jams")
          .select(`
            *,
            jam_participants (
              id,
              state
            )
          `)
          .in("id", participatedJamIds)
          .eq("status", "published")
          .order("starts_at", { ascending: true });

        if (participatedError) throw participatedError;

        const participatedWithCounts = (participatedJams || []).map(jam => ({
          ...jam,
          participant_count: jam.jam_participants?.filter((p: any) => p.state === "participant").length || 0,
          waiting_count: jam.jam_participants?.filter((p: any) => p.state === "waiting").length || 0,
        }));

        setUpcomingJams(participatedWithCounts);
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Disconnesso",
      description: "Alla prossima!",
    });
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalParticipations = upcomingJams.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ciao, {profile.name}!</h1>
            <p className="text-muted-foreground">Benvenuto nella tua dashboard</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/create-jam")}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crea Jam
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="rounded-xl"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/10 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">I Miei Jam</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myJams.length}</div>
              <p className="text-xs text-muted-foreground">Jam creati</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Partecipazioni</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalParticipations}</div>
              <p className="text-xs text-muted-foreground">Jam a cui partecipo</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ruolo Preferito</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {profile.main_role === "base" ? "B" : profile.main_role === "flyer" ? "F" : "B/F"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{profile.main_role}</div>
              <p className="text-xs text-muted-foreground">Il tuo ruolo principale</p>
            </CardContent>
          </Card>
        </div>

        {/* Jams Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-xl">Prossime Jam</TabsTrigger>
            <TabsTrigger value="my-jams" className="rounded-xl">Le mie Jam</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="mt-6">
            <Card className="border-primary/10 rounded-2xl">
              <CardHeader>
                <CardTitle>Prossime Jam</CardTitle>
                <CardDescription>Jam a cui hai deciso di partecipare</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : upcomingJams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Non hai ancora prenotato nessuna jam</p>
                    <p className="text-sm text-muted-foreground mt-2">Inizia a cercare jam nella tua zona!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {upcomingJams.map((jam) => (
                      <JamCard key={jam.id} jam={jam} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-jams" className="mt-6">
            <Card className="border-primary/10 rounded-2xl">
              <CardHeader>
                <CardTitle>Le mie Jam</CardTitle>
                <CardDescription>Jam che hai creato e stai organizzando</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : myJams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Non hai ancora creato nessuna jam</p>
                    <Button
                      onClick={() => navigate("/create-jam")}
                      className="mt-4 rounded-xl"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crea la tua prima Jam
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {myJams.map((jam) => (
                      <JamCard key={jam.id} jam={jam} showStatus />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;