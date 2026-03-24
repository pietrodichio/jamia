import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { profilesApi } from "@/api/profiles.api";
import { telegramApi } from "@/api/telegram.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, ArrowLeft, MessageCircle } from "lucide-react";
import imageCompression from "browser-image-compression";

const ROLE_OPTIONS = ["base", "flyer"] as const;
type MainRole = (typeof ROLE_OPTIONS)[number];

const sanitizeMainRole = (role?: string | null): MainRole =>
  role === "flyer" ? "flyer" : "base";

const Profile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [mainRole, setMainRole] = useState<MainRole>(sanitizeMainRole());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const profile = await profilesApi.getProfile(user.id);
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setPhone(profile.phone || "");
        setBio(profile.bio || "");
        setCity(profile.city || "");
        setMainRole(sanitizeMainRole(profile.main_role));
        if (profile.photo_url) {
          setPhotoPreview(profile.photo_url);
        }
        setTelegramLinked(Boolean(profile.telegram_chat_id));
        setTelegramUsername(profile.telegram_username || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare il profilo",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    loadProfile();
  }, [navigate, toast]);

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

  const handleGenerateTelegramLink = async () => {
    setIsGeneratingLink(true);

    try {
      const { botLink } = await telegramApi.generateLink();
      window.open(botLink, "_blank");

      toast({
        title: "Link generato!",
        description: "Apri Telegram e clicca su 'Start' per collegare il tuo account.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error generating Telegram link:", error);
      toast({
        title: "Errore",
        description: "Impossibile generare il link. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    const confirmed = window.confirm(
      "Sei sicuro di voler scollegare il tuo account Telegram? Non riceverai più notifiche."
    );

    if (!confirmed) {
      return;
    }

    try {
      await telegramApi.unlinkAccount();
      setTelegramLinked(false);
      setTelegramUsername("");

      toast({
        title: "Account scollegato",
        description: "Il tuo account Telegram è stato scollegato con successo.",
      });
    } catch (error) {
      console.error("Error unlinking Telegram:", error);
      toast({
        title: "Errore",
        description: "Impossibile scollegare l'account. Riprova più tardi.",
        variant: "destructive",
      });
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
        description: "Le tue modifiche sono state salvate con successo.",
      });

      navigate("/dashboard");
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

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-2xl border-primary/10 shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Modifica Profilo</CardTitle>
          </div>
          <CardDescription>
            Aggiorna le tue informazioni personali
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
              <Select
                value={mainRole}
                onValueChange={(value) => setMainRole(value as MainRole)}
                disabled={isLoading}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="flyer">Flyer</SelectItem>
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

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <Label className="text-base font-semibold">Notifiche Telegram</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Collega il tuo account Telegram per ricevere notifiche quando qualcuno si iscrive o annulla la partecipazione alle tue jam.
              </p>

              {telegramLinked ? (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Account collegato
                      </p>
                      {telegramUsername && (
                        <p className="mt-1 text-sm text-muted-foreground">@{telegramUsername}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUnlinkTelegram}
                      disabled={isLoading}
                      className="rounded-xl"
                    >
                      Scollega
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Riceverai messaggi diretti su Telegram per le tue jam.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-dashed border-primary/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    Nessun account Telegram collegato
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateTelegramLink}
                    disabled={isLoading || isGeneratingLink}
                    className="w-full rounded-xl"
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generazione link...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Collega Telegram
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Cliccando sul pulsante si aprirà Telegram. Clicca "Start" per completare il collegamento.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => navigate("/dashboard")}
                disabled={isLoading || isUploadingPhoto}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl"
                disabled={isLoading || isUploadingPhoto}
              >
                {(isLoading || isUploadingPhoto) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploadingPhoto ? "Caricamento foto..." : "Salva modifiche"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
