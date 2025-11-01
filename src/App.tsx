import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EmailConfirmation from "./pages/EmailConfirmation";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import CreateJam from "./pages/CreateJam";
import JamDetails from "./pages/JamDetails";
import EditJam from "./pages/EditJam";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import OGImage from "./pages/OGImage";

const queryClient = new QueryClient();

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
        <AuthListener />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-jam" element={<CreateJam />} />
          <Route path="/jam/:id" element={<JamDetails />} />
          <Route path="/jam/:id/edit" element={<EditJam />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/og-image" element={<OGImage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
