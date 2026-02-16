import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signOutSafely } from "@/integrations/supabase/auth";
import { profilesApi, type Profile } from "@/api/profiles.api";
import { jamsApi, type Jam } from "@/api/jams.api";
import { managersApi, type JamManager } from "@/api/managers.api";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatisticsSection } from "@/components/dashboard/StatisticsSection";
import { DigestNudgeBanner } from "@/components/dashboard/DigestNudgeBanner";
import { DashboardActions, DashboardMobileMenu } from "@/components/dashboard/DashboardActions";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { ParticipationsTab } from "@/components/dashboard/ParticipationsTab";
import { EventManagementTab } from "@/components/dashboard/EventManagementTab";
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
        await signOutSafely().catch(() => null);
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
    try {
      await signOutSafely();
      queryClient.clear();
      toast({
        title: "Disconnesso",
        description: "Alla prossima!",
      });
    } catch {
      toast({
        title: "Errore logout",
        description: "Impossibile disconnettersi ora. Riprova tra poco.",
        variant: "destructive",
      });
    }
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
          <div className="w-full sm:w-auto">
            <div className="flex items-start justify-between gap-3 sm:block">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">Ciao, {profile.first_name}! 👋</p>
              </div>
              <div className="sm:hidden">
                <DashboardMobileMenu
                  onProfileClick={() => navigate("/profile")}
                  onSignOut={handleSignOut}
                />
              </div>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <DashboardActions />
            <Button
              onClick={() => navigate("/profile")}
              variant="secondary"
              size="sm"
              className="hidden rounded-xl sm:inline-flex"
            >
              <User className="mr-2 h-4 w-4" />
              Profilo
            </Button>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              size="sm"
              className="hidden rounded-xl sm:inline-flex"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>

        {/* Digest nudge banner for users who haven't configured email preferences */}
        <DigestNudgeBanner />

        {/* Statistics section - shared overview above tabs */}
        <StatisticsSection userId={currentUser?.id} />

        {/* Dashboard Tabs - URL synchronized */}
        <DashboardTabs>
          {{
            participateContent: (
              <ParticipationsTab
                userId={currentUser?.id}
                activeParticipatedJams={activeParticipatedJams}
                pastParticipatedJams={pastParticipatedJams}
                participationsLoading={participatingJamsQuery.isLoading}
                isOwnerOrManager={isOwnerOrManager}
                isOwner={isOwner}
                onClone={handleClone}
                onManageManagers={handleManageManagers}
              />
            ),
            manageContent: (
              <EventManagementTab
                userId={currentUser?.id}
                draftOwnedJams={draftOwnedJams}
                activeOwnedJams={activeOwnedJams}
                pastOwnedJams={pastOwnedJams}
                jamsLoading={myJamsQuery.isLoading}
                isOwnerOrManager={isOwnerOrManager}
                isOwner={isOwner}
                onClone={handleClone}
                onManageManagers={handleManageManagers}
              />
            ),
          }}
        </DashboardTabs>
      </div>
    </div>
  );
};

export default Dashboard;
