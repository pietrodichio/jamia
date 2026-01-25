import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profilesApi, type Profile } from "@/api/profiles.api";
import { jamsApi, type Jam } from "@/api/jams.api";
import { managersApi, type JamManager } from "@/api/managers.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, LogOut, Loader2, User, History, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JamCard from "@/components/JamCard";
import { UpcomingEventsSection } from "@/components/dashboard/UpcomingEventsSection";
import { RecommendationsSection } from "@/components/dashboard/RecommendationsSection";
import { StatisticsSection } from "@/components/dashboard/StatisticsSection";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auth state listener for sign out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        navigate("/auth");
      } else if (event === "SIGNED_IN" && session?.user && !session.user.email_confirmed_at) {
        navigate("/email-confirmation");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, queryClient]);

  // Current user query
  const currentUserQuery = useQuery<SupabaseUser | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // Clear invalid session and redirect to auth
        await supabase.auth.signOut();
        navigate("/auth");
        return null;
      }
      return user;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const currentUser = currentUserQuery.data ?? null;
  const isEmailConfirmed = Boolean(
    currentUser?.email_confirmed_at || currentUser?.confirmed_at,
  );

  // Profile query
  const profileQuery = useQuery<Profile | null>({
    queryKey: ["profile", currentUser?.id],
    enabled: Boolean(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) {
        return null;
      }
      return profilesApi.getProfile(currentUser.id);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const profile = profileQuery.data ?? null;
  const isSuperAdmin = Boolean(profile?.is_super_admin);

  // Handle auth redirects
  useEffect(() => {
    if (currentUserQuery.isSuccess && !currentUser) {
      navigate("/auth");
      return;
    }

    if (currentUser && !isEmailConfirmed) {
      navigate("/email-confirmation");
      return;
    }

    if (profile && !profile.phone) {
      navigate("/profile-setup");
      return;
    }
  }, [currentUser, currentUserQuery.isSuccess, isEmailConfirmed, navigate, profile]);

  // My jams query
  const myJamsQuery = useQuery<Jam[]>({
    queryKey: ["jams", "my"],
    enabled: Boolean(currentUser?.id && profile && profile.phone),
    queryFn: async () => {
      return jamsApi.getMyJams();
    },
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Participating jams query
  const participatingJamsQuery = useQuery<Jam[]>({
    queryKey: ["jams", "participating"],
    enabled: Boolean(currentUser?.id && profile && profile.phone),
    queryFn: async () => {
      return jamsApi.getParticipatingJams();
    },
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const myJams = myJamsQuery.data ?? [];
  const upcomingJams = participatingJamsQuery.data ?? [];

  // Compute all jams and unique jam IDs for managers query
  const allJams = useMemo(() => {
    return [...myJams, ...upcomingJams];
  }, [myJams, upcomingJams]);

  const uniqueJamIds = useMemo(() => {
    return Array.from(new Set(allJams.map((jam) => jam.id)));
  }, [allJams]);

  // Managers batch query
  const managersQuery = useQuery<Record<string, JamManager[]>>({
    queryKey: ["jam-managers-batch", uniqueJamIds.sort().join(",")],
    enabled: Boolean(
      uniqueJamIds.length > 0 &&
      myJamsQuery.isSuccess &&
      participatingJamsQuery.isSuccess
    ),
    queryFn: async () => {
      try {
        return await managersApi.getJamManagersBatch(uniqueJamIds);
      } catch (error) {
        console.warn("[Dashboard] batch managers fetch failed", { error });
        // Return empty object on error - jams will have no managers
        return {};
      }
    },
    staleTime: 2 * 60 * 1000,
    refetchOnMount: true,
  });

  const managersByJam = managersQuery.data ?? {};

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    toast({
      title: "Disconnesso",
      description: "Alla prossima!",
    });
  };

  const isOwnerOrManager = (jam: Jam) => {
    if (isSuperAdmin) return true;
    if (!currentUser) return false;
    if (jam.owner_id === currentUser.id) return true;
    const managers = managersByJam[jam.id] || [];
    return managers.some((manager) => manager.user_id === currentUser.id);
  };

  const isOwner = (jam: Jam) => {
    if (isSuperAdmin) return true;
    if (!currentUser) return false;
    return jam.owner_id === currentUser.id;
  };

  // Clone jam mutation
  const cloneMutation = useMutation({
    mutationFn: async (jamId: string) => {
      return jamsApi.cloneJam(jamId);
    },
    onSuccess: (clonedJam) => {
      // Invalidate jams queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["jams"] });
      toast({
        title: "Jam clonata!",
        description: "La jam è stata clonata con successo",
      });
      navigate(`/jam/${clonedJam.id}/edit`);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : "Errore sconosciuto";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleClone = (jam: Jam) => {
    cloneMutation.mutate(jam.id);
  };

  const handleManageManagers = () => {
    // Invalidate managers queries to refetch when dialog closes
    queryClient.invalidateQueries({ queryKey: ["jam-managers"] });
    queryClient.invalidateQueries({ queryKey: ["jam-managers-batch"] });
  };

  // Show loading while auth/profile is loading
  if (currentUserQuery.isLoading || (currentUser && profileQuery.isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if no user or profile (redirects are handled in useEffect)
  if (!currentUser || !profile) {
    return null;
  }

  const totalParticipations = upcomingJams.length;

  const now = new Date();
  const isJamPast = (jam: Jam) => new Date(jam.ends_at) < now;

  const activeParticipatedJams = upcomingJams
    .filter(jam => !isJamPast(jam))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const pastParticipatedJams = upcomingJams
    .filter(jam => isJamPast(jam))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const draftOwnedJams = myJams
    .filter(jam => jam.status === "draft")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const nonDraftOwnedJams = myJams.filter(jam => jam.status !== "draft");

  const activeOwnedJams = nonDraftOwnedJams
    .filter(jam => !isJamPast(jam))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const pastOwnedJams = nonDraftOwnedJams
    .filter(jam => isJamPast(jam))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Header with compact actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Ciao, {profile.first_name}! 👋</p>
          </div>
          <div className="flex gap-2 justify-between w-full md:justify-end md:w-auto flex-wrap">
            <DashboardActions />
            <Button
              onClick={() => navigate("/profile")}
              variant="secondary"
              size="sm"
              className="rounded-xl"
            >
              <User className="mr-2 h-4 w-4" />
              Profilo
            </Button>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              size="sm"
              className="rounded-xl"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>

        {/* Information-first sections */}
        <div className="space-y-6">
          {/* Statistics section - top, full width */}
          <StatisticsSection userId={currentUser?.id} />

          {/* Upcoming Events section */}
          <UpcomingEventsSection userId={currentUser?.id} />

          {/* Recommendations section */}
          <RecommendationsSection userId={currentUser?.id} />
        </div>

        {/* Legacy Jams Management - kept for backward compatibility */}
        <div className="pt-6 border-t border-border">
          <h2 className="text-2xl font-bold mb-4">Gestione Jam</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-primary/10 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Le mie Jam</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myJams.length}</div>
                <p className="text-xs text-muted-foreground">Jam create</p>
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

          <div className="space-y-10">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">Gestisci le tue Jam</h3>
                <p className="text-sm text-muted-foreground">Bozze, jam attive e storico organizzazione</p>
              </div>

              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Bozze</CardTitle>
                  <CardDescription>Jam salvate ma non ancora pubblicate</CardDescription>
                </CardHeader>
                <CardContent>
                  {myJamsQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : draftOwnedJams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nessuna bozza salvata</p>
                      <Button
                        onClick={() => navigate("/create-jam")}
                        className="mt-4 rounded-xl"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crea una nuova Jam
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {draftOwnedJams.map((jam) => (
                        <JamCard
                          key={jam.id}
                          jam={jam}
                          showStatus
                          isOwnerOrManager={isOwnerOrManager(jam)}
                          isOwner={isOwner(jam)}
                          onClone={() => handleClone(jam)}
                          onManageManagers={handleManageManagers}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Jam attive</CardTitle>
                  <CardDescription>Jam pubblicate che stai organizzando</CardDescription>
                </CardHeader>
                <CardContent>
                  {myJamsQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : activeOwnedJams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nessuna jam attiva in questo momento</p>
                      <Button
                        onClick={() => navigate("/create-jam")}
                        className="mt-4 rounded-xl"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crea una Jam
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {activeOwnedJams.map((jam) => (
                        <JamCard
                          key={jam.id}
                          jam={jam}
                          showStatus
                          isOwnerOrManager={isOwnerOrManager(jam)}
                          isOwner={isOwner(jam)}
                          onClone={() => handleClone(jam)}
                          onManageManagers={handleManageManagers}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Storico gestione</CardTitle>
                  <CardDescription>Jam che hai organizzato nel passato</CardDescription>
                </CardHeader>
                <CardContent>
                  {myJamsQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : pastOwnedJams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nessuna jam gestita nel passato</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {pastOwnedJams.map((jam) => (
                        <JamCard
                          key={jam.id}
                          jam={jam}
                          showStatus
                          isOwnerOrManager={isOwnerOrManager(jam)}
                          isOwner={isOwner(jam)}
                          onClone={() => handleClone(jam)}
                          onManageManagers={handleManageManagers}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold">Le tue partecipazioni</h3>
                <p className="text-sm text-muted-foreground">Jam a cui partecipi come dancer</p>
              </div>

              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Prossime Jam</CardTitle>
                  <CardDescription>Jam a cui hai deciso di partecipare</CardDescription>
                </CardHeader>
                <CardContent>
                  {participatingJamsQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : activeParticipatedJams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Non hai ancora prenotato nessuna jam</p>
                      <p className="text-sm text-muted-foreground mt-2">Inizia a cercare jam nella tua zona!</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {activeParticipatedJams.map((jam) => (
                        <JamCard
                          key={jam.id}
                          jam={jam}
                          isOwnerOrManager={isOwnerOrManager(jam)}
                          isOwner={isOwner(jam)}
                          onClone={() => handleClone(jam)}
                          onManageManagers={handleManageManagers}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Storico partecipazioni</CardTitle>
                  <CardDescription>Jam a cui hai partecipato nel passato</CardDescription>
                </CardHeader>
                <CardContent>
                  {participatingJamsQuery.isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : pastParticipatedJams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nessuna partecipazione passata</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {pastParticipatedJams.map((jam) => (
                        <JamCard
                          key={jam.id}
                          jam={jam}
                          isOwnerOrManager={isOwnerOrManager(jam)}
                          isOwner={isOwner(jam)}
                          onClone={() => handleClone(jam)}
                          onManageManagers={handleManageManagers}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
