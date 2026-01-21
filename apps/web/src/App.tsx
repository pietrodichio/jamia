import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EmailConfirmation from "./pages/EmailConfirmation";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import CreateJam from "./pages/CreateJam";
import JamDetailsLayout from "./pages/jam-details/JamDetailsLayout";
import JamOverviewPage from "./pages/jam-details/JamOverviewPage";
import JamCommunicationPage from "./pages/jam-details/JamCommunicationPage";
import EditJam from "./pages/EditJam";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import OGImage from "./pages/OGImage";

const queryClient = new QueryClient();

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (
      hash &&
      hash.includes("type=invite") &&
      window.location.pathname !== "/accept-invite"
    ) {
      console.info("[AuthListener] Invite hash detected, redirecting to /accept-invite");
      navigate(`/accept-invite${window.location.search}${hash}`, { replace: true });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);


  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <AuthListener />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/email-confirmation" element={<EmailConfirmation />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create-jam" element={<CreateJam />} />
              <Route path="/jam/:id/*" element={<JamDetailsLayout />}>
                <Route index element={<JamOverviewPage />} />
                <Route path="communication" element={<JamCommunicationPage />} />
              </Route>
              <Route path="/jam/:id/edit" element={<EditJam />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/og-image" element={<OGImage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
