import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { profilesApi } from "@/api/profiles.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X } from "lucide-react";
import imageCompression from "browser-image-compression";

const phoneNumberRegex = /^\+?[0-9\s\-().]{7,20}$/;

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Il nome è obbligatorio."),
  lastName: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .min(1, "Il telefono è obbligatorio.")
    .refine((value) => phoneNumberRegex.test(value), {
      message: "Inserisci un numero di telefono valido.",
    }),
  city: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  mainRole: z.enum(["base", "flyer", "both"]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      bio: "",
      city: "",
      mainRole: "both",
    },
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (!user.email_confirmed_at) {
        navigate("/email-confirmation");
        return;
      }

      try {
        const identityMetadata = user.identities?.find((identity) => identity.provider === "google")?.identity_data ?? {};
        const userMetadata = user.user_metadata ?? {};
        const metadataSource = { ...identityMetadata, ...userMetadata };

        const fullName = (metadataSource.full_name || metadataSource.name || "") as string;
        const [fullFirstName, ...fullRest] = fullName ? fullName.trim().split(/\s+/) : ["", ""];

        const inferredFirstName =
          (metadataSource.given_name as string | undefined) ??
          (metadataSource.first_name as string | undefined) ??
          (fullFirstName || undefined);

        const inferredLastName =
          (metadataSource.family_name as string | undefined) ??
          (metadataSource.last_name as string | undefined) ??
          (fullRest.length ? fullRest.join(" ") : undefined);

        const inferredAvatar = (metadataSource.avatar_url || metadataSource.picture) as string | undefined;

        const profile = await profilesApi.getProfile(user.id);

        const cleanedProfileFirstName = profile.first_name?.trim() ?? "";
        const cleanedProfileLastName = profile.last_name?.trim() ?? "";

        const inferredPhone =
          (metadataSource.phone as string | undefined) ??
          (metadataSource.phone_number as string | undefined) ??
          (metadataSource.phoneNumber as string | undefined);

        let resolvedFirstName = cleanedProfileFirstName || inferredFirstName || "";
        let resolvedLastName = cleanedProfileLastName || inferredLastName || "";

        if (cleanedProfileFirstName?.includes(" ") && !cleanedProfileLastName) {
          const [first, ...rest] = cleanedProfileFirstName.split(/\s+/);
          resolvedFirstName = first;
          if (!resolvedLastName && rest.length) {
            resolvedLastName = rest.join(" ");
          }
        }

        reset({
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          phone: profile.phone || inferredPhone || "",
          bio: profile.bio || "",
          city: profile.city || "",
          mainRole: profile.main_role || "both",
        });

        const candidatePhoto = profile.photo_url?.trim();
        const isPlaceholderPhoto = candidatePhoto
          ? /(placeholder|default-avatar|anon)/i.test(candidatePhoto)
          : false;
        const resolvedPhoto = (!isPlaceholderPhoto && candidatePhoto) || inferredAvatar;

        if (resolvedPhoto) {
          setPhotoPreview(resolvedPhoto);
        }
      } catch {
        toast({
          title: "Errore",
          description: "Impossibile recuperare il profilo.",
          variant: "destructive",
        });
      }
    };

    checkProfile();
  }, [navigate, reset, toast]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({
        title: "Formato non valido",
        description: "Carica solo immagini JPG o PNG.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "L'immagine deve essere inferiore a 2MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: file.type,
      };

      const compressedFile = await imageCompression(file, options);
      setPhotoFile(compressedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile elaborare l'immagine.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;

    setIsUploadingPhoto(true);
    try {
      const fileExt = photoFile.type.split("/")[1];
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, photoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch {
      toast({
        title: "Errore upload",
        description: "Impossibile caricare la foto profilo.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      let photoUrl = photoPreview;

      if (photoFile) {
        const uploadedUrl = await uploadPhoto(user.id);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      await profilesApi.updateProfile(user.id, {
        first_name: values.firstName,
        last_name: values.lastName || "",
        phone: values.phone,
        bio: values.bio || "",
        city: values.city || "",
        main_role: values.mainRole,
        photo_url: photoUrl || undefined,
      });

      toast({
        title: "Profilo aggiornato!",
        description: "Il tuo profilo è stato salvato con successo.",
      });

      const jamUrl = localStorage.getItem("jamia_redirect_url");
      if (jamUrl) {
        localStorage.removeItem("jamia_redirect_url");
        navigate(jamUrl);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  });

  const triggerFilePicker = () => {
    if (isLoading || isUploadingPhoto) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-2xl border-primary/10 shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Completa il tuo profilo</CardTitle>
          <CardDescription>
            Raccontaci qualcosa di te per iniziare a partecipare alle tue jam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Foto profilo</Label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemovePhoto}
                        disabled={isLoading || isUploadingPhoto}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerFilePicker}
                      className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-primary/20 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      disabled={isLoading || isUploadingPhoto}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </button>
                  )}
                  <div className="flex-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      disabled={isLoading || isUploadingPhoto}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG o PNG, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="firstName">Nome *</FormLabel>
                      <FormControl>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Mario"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="lastName">Cognome</FormLabel>
                      <FormControl>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Rossi"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="phone">Telefono *</FormLabel>
                      <FormControl>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+39 123 456 7890"
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="city">Città</FormLabel>
                      <FormControl>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Milano, Roma, Torino..."
                          disabled={isLoading}
                          className="rounded-xl"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="mainRole"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel htmlFor="mainRole">Ruolo principale *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="mainRole" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base">Base</SelectItem>
                        <SelectItem value="flyer">Flyer</SelectItem>
                        <SelectItem value="both">Entrambi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel htmlFor="bio">Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        id="bio"
                        placeholder="Raccontaci qualcosa di te, la tua esperienza con l'AcroYoga..."
                        disabled={isLoading}
                        rows={4}
                        className="rounded-xl resize-none"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={isLoading || isUploadingPhoto}
              >
                {(isLoading || isUploadingPhoto) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploadingPhoto ? "Caricamento foto..." : "Salva profilo"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
