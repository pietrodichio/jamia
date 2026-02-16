import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signOutSafely } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Schemas
const loginSchema = z.object({
  email: z.string().trim().min(1, "L'email è obbligatoria.").email("Inserisci un'email valida."),
  password: z.string().min(1, "La password è obbligatoria."),
});

const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Il nome è obbligatorio."),
    email: z.string().trim().min(1, "L'email è obbligatoria.").email("Inserisci un'email valida."),
    password: z.string().min(6, "La password deve essere di almeno 6 caratteri."),
    confirmPassword: z.string().min(1, "Conferma la password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono.",
    path: ["confirmPassword"],
  });

const passwordResetSchema = z.object({
  email: z.string().trim().min(1, "L'email è obbligatoria.").email("Inserisci un'email valida."),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Check if user is already logged in
  const currentUserQuery = useQuery<SupabaseUser | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        // Clear invalid session (e.g., user doesn't exist in DB after reset)
        await signOutSafely().catch(() => null);
        return null;
      }
      return user ?? null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const currentUser = currentUserQuery.data ?? null;
  const isEmailConfirmed = Boolean(
    currentUser?.email_confirmed_at || currentUser?.confirmed_at,
  );

  // Listen for auth state changes to handle redirects after login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Invalidate query cache to refetch user data
        queryClient.invalidateQueries({ queryKey: ["current-user"] });

        // Check if email is confirmed
        const emailConfirmed = Boolean(
          session.user.email_confirmed_at || session.user.confirmed_at
        );

        if (emailConfirmed) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/email-confirmation", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, queryClient]);

  // Redirect to dashboard if already logged in and email confirmed
  useEffect(() => {
    if (currentUserQuery.isSuccess && currentUser && isEmailConfirmed) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, currentUserQuery.isSuccess, isEmailConfirmed, navigate]);

  // Forms
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordResetForm = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  // Set initial mode based on URL parameter
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setIsSignUp(true);
    } else if (mode === "login") {
      setIsSignUp(false);
    }
  }, [searchParams]);

  // Store jam URL if user came from a jam link
  useEffect(() => {
    const jamUrl = searchParams.get("jam");
    if (jamUrl) {
      localStorage.setItem("jamia_redirect_url", jamUrl);
    }
  }, [searchParams]);

  const handlePasswordReset = passwordResetForm.handleSubmit(async (values) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Email inviata!",
        description: "Ti abbiamo inviato un'email con le istruzioni per reimpostare la password.",
      });

      setIsForgotPassword(false);
      passwordResetForm.reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsGoogleLoading(false);
    }
  });

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setIsGoogleLoading(true);

    try {
      const redirectUrl = new URL(`${window.location.origin}/auth/callback`);
      const jamUrl = localStorage.getItem("jamia_redirect_url");
      redirectUrl.searchParams.set("next", jamUrl || "/dashboard");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl.toString(),
          scopes: "openid email profile https://www.googleapis.com/auth/user.phonenumbers.read",
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
      setIsGoogleLoading(false);
    }
  };

  const getPasswordErrorMessage = (error: unknown): string => {
    if (!(error instanceof Error)) {
      return "Si è verificato un errore";
    }

    const errorMessage = error.message.toLowerCase();

    // Parse common Supabase password errors and provide user-friendly Italian messages
    if (errorMessage.includes("password") && errorMessage.includes("6")) {
      return "La password deve essere di almeno 6 caratteri.";
    }
    if (errorMessage.includes("password") && errorMessage.includes("weak")) {
      return "La password è troppo debole. Usa una password più complessa.";
    }
    if (errorMessage.includes("password") && errorMessage.includes("invalid")) {
      return "La password non è valida. Assicurati che sia di almeno 6 caratteri.";
    }
    if (errorMessage.includes("password")) {
      return "La password non soddisfa i requisiti. Deve essere di almeno 6 caratteri.";
    }

    return error.message;
  };

  const handleSignup = signupForm.handleSubmit(async (values) => {
    setIsLoading(true);

    try {
      const trimmedEmail = values.email.trim();
      const jamUrl = localStorage.getItem("jamia_redirect_url");
      const redirectTo = jamUrl
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(jamUrl)}`
        : `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: values.password,
        options: {
          data: { name: values.name },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      // Profile and role will be created by database trigger
      // No need to create them manually here due to RLS restrictions

      localStorage.setItem("jamia_signup_email", trimmedEmail);

      toast({
        title: "Registrazione completata!",
        description: "Ti abbiamo inviato un'email di conferma. Controlla la tua casella di posta.",
      });

      navigate("/email-confirmation", { state: { email: trimmedEmail } });
    } catch (error: unknown) {
      const errorMessage = getPasswordErrorMessage(error);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsGoogleLoading(false);
    }
  });

  const handleLogin = loginForm.handleSubmit(async (values) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      // Invalidate query cache to refetch user data
      queryClient.invalidateQueries({ queryKey: ["current-user"] });

      toast({
        title: "Accesso effettuato!",
        description: "Bentornato in Jamia.",
      });

      // Navigation will be handled by auth state change listener
      // But we can also navigate directly as fallback
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const emailConfirmed = Boolean(
          session.user.email_confirmed_at || session.user.confirmed_at
        );
        if (emailConfirmed) {
          navigate("/dashboard");
        } else {
          navigate("/email-confirmation");
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsGoogleLoading(false);
    }
  });

  // Show loading while checking auth state
  if (currentUserQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render form if user is logged in (redirect is handled in useEffect)
  if (currentUser && isEmailConfirmed) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md border-primary/10 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold text-primary">Jamia</CardTitle>
          <CardDescription className="text-base">
            {isForgotPassword
              ? "Reimposta la tua password"
              : isSignUp
                ? "Crea il tuo account"
                : "Accedi al tuo account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            <Form key="password-reset" {...passwordResetForm}>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <FormField
                  control={passwordResetForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="tua@email.it"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Invia email di reimpostazione
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      passwordResetForm.reset();
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    disabled={isLoading}
                  >
                    Torna al login
                  </button>
                </div>
              </form>
            </Form>
          ) : isSignUp ? (
            <Form key="sign-up" {...signupForm}>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                  >
                    {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continua con Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
                    <Separator className="flex-1" />
                    <span className="tracking-wide">Oppure</span>
                    <Separator className="flex-1" />
                  </div>
                </div>

                <FormField
                  control={signupForm.control}
                  name="name"
                  render={({ field }) => {
                    return (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="name">Nome</FormLabel>
                        <FormControl>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Il tuo nome"
                            disabled={isLoading}
                            className="rounded-xl"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => {
                    return (
                      <FormItem className="space-y-2">
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <FormControl>
                          <Input
                            id="email"
                            type="email"
                            placeholder="tua@email.it"
                            disabled={isLoading}
                            className="rounded-xl"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="password">Password</FormLabel>
                      <FormControl>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        La password deve essere di almeno 6 caratteri.
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="confirmPassword">Conferma Password</FormLabel>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrati
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      signupForm.reset();
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    disabled={isLoading}
                  >
                    Hai già un account? Accedi
                  </button>
                </div>
              </form>
            </Form>
          ) : (
            <Form key="login" {...loginForm}>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                  >
                    {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continua con Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
                    <Separator className="flex-1" />
                    <span className="tracking-wide">Oppure</span>
                    <Separator className="flex-1" />
                  </div>
                </div>

                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="tua@email.it"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          disabled={isLoading}
                        >
                          Hai dimenticato la password?
                        </button>
                      </div>
                      <FormControl>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accedi
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      loginForm.reset();
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    disabled={isLoading}
                  >
                    Non hai un account? Registrati
                  </button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
