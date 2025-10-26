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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import imageCompression from "browser-image-compression";

const ProfileSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [mainRole, setMainRole] = useState<"base" | "flyer" | "both">("both");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        navigate("/email-confirmation");
        return;
      }

      try {
        const identityMetadata = user.identities?.find((identity) => identity.provider === "google")?.identity_data ?? {};
        const userMetadata = user.user_metadata ?? {};
        const metadataSource = { ...identityMetadata, ...userMetadata };

        console.log("[ProfileSetup] identityMetadata:", identityMetadata);
        console.log("[ProfileSetup] userMetadata:", userMetadata);
        console.log("[ProfileSetup] merged metadataSource:", metadataSource);

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

        console.log("[ProfileSetup] fullName:", fullName);
        console.log("[ProfileSetup] inferredFirstName:", inferredFirstName);
        console.log("[ProfileSetup] inferredLastName:", inferredLastName);
        console.log("[ProfileSetup] inferredAvatar:", inferredAvatar);

        const profile = await profilesApi.getProfile(user.id);

        console.log("[ProfileSetup] API profile:", profile);

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

        console.log("[ProfileSetup] resolvedFirstName:", resolvedFirstName);
        console.log("[ProfileSetup] resolvedLastName:", resolvedLastName);
        console.log("[ProfileSetup] inferredPhone:", inferredPhone);

        setFirstName(resolvedFirstName);
        setLastName(resolvedLastName);
        setPhone(profile.phone || inferredPhone || "");
        setBio(profile.bio || "");
        setCity(profile.city || "");
        setMainRole(profile.main_role || "both");

        const candidatePhoto = profile.photo_url?.trim();
        const isPlaceholderPhoto = candidatePhoto
          ? /(placeholder|default-avatar|anon)/i.test(candidatePhoto)
          : false;
        const resolvedPhoto = (!isPlaceholderPhoto && candidatePhoto) || inferredAvatar;

        console.log("[ProfileSetup] candidatePhoto:", candidatePhoto);
        console.log("[ProfileSetup] isPlaceholderPhoto:", isPlaceholderPhoto);
        console.log("[ProfileSetup] resolvedPhoto:", resolvedPhoto);

        if (resolvedPhoto) {
          setPhotoPreview(resolvedPhoto);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    checkProfile();
  }, [navigate]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({
        title: "Formato non valido",
        description: "Carica solo immagini JPG o PNG.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "L'immagine deve essere inferiore a 2MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: file.type,
      };
      
      const compressedFile = await imageCompression(file, options);
      setPhotoFile(compressedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
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
      const fileExt = photoFile.type.split('/')[1];
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading photo:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      let photoUrl = photoPreview;

      // Upload photo if a new one was selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(user.id);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      await profilesApi.updateProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        phone,
        bio,
        city,
        main_role: mainRole,
        photo_url: photoUrl || undefined,
      });

      toast({
        title: "Profilo aggiornato!",
        description: "Il tuo profilo è stato salvato con successo.",
      });

      // Check if there's a jam URL to redirect to
      const jamUrl = localStorage.getItem('jamia_redirect_url');
      if (jamUrl) {
        localStorage.removeItem('jamia_redirect_url');
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Upload */}
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
                  <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-primary/20">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
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
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Mario"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Rossi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="+39 123 456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Milano, Roma, Torino..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainRole">Ruolo principale *</Label>
              <Select value={mainRole} onValueChange={(value: any) => setMainRole(value)} disabled={isLoading}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="flyer">Flyer</SelectItem>
                  <SelectItem value="both">Entrambi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Raccontaci qualcosa di te, la tua esperienza con l'AcroYoga..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isLoading}
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={isLoading || isUploadingPhoto}
            >
              {(isLoading || isUploadingPhoto) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploadingPhoto ? "Caricamento foto..." : "Salva profilo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
