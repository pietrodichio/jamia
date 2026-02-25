import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
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
import { EmailPreferencesCard } from "@/components/settings/EmailPreferencesCard";
import { useIpLocation } from "@/hooks/useIpLocation";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { cn } from "@/lib/utils";

const phoneNumberRegex = /^\+?[0-9\s\-().]{7,20}$/;
const ROLE_OPTIONS = ["base", "flyer"] as const;

interface PlacePrediction {
  description: string;
  place_id: string;
  placePrediction: {
    text: { text?: string } | string;
    placeId: string;
    toPlace?: () => {
      fetchFields: (options: { fields: string[] }) => Promise<void>;
      location?: { lat: () => number; lng: () => number };
      addressComponents?: Array<{
        types: string[];
        longText: string;
      }>;
    };
  };
}
type MainRole = (typeof ROLE_OPTIONS)[number];

const sanitizeMainRole = (role?: string | null): MainRole =>
  role === "flyer" ? "flyer" : "base";

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
  mainRole: z.enum(ROLE_OPTIONS),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileSetup = () => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // City autocomplete state
  const [citySearchText, setCitySearchText] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const lastRequestId = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<any>(null);

  // IP location and Google Maps hooks
  const { data: ipLocation, isSuccess: ipLocationReady } = useIpLocation();
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded: placesLibraryLoaded } = useGoogleMaps(googleApiKey);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      bio: "",
      city: "",
    },
  });
  const { control, handleSubmit, reset } = form;

  // Session token management for Google Places
  const getSessionToken = useCallback(() => {
    const maps = (window as any).google?.maps;
    if (!sessionTokenRef.current && maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  // Handle city selection from predictions
  const handleSelectCity = async (prediction: PlacePrediction) => {
    if (!prediction) return;

    // Clear pending requests
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    setIsLoadingPredictions(true);
    setPredictions([]);
    setIsCityDropdownOpen(false);

    try {
      if (prediction.placePrediction?.toPlace) {
        const place = prediction.placePrediction.toPlace() as any;
        await place.fetchFields({
          fields: ['location', 'addressComponents'],
        });

        // Extract city name from address components
        let cityName = '';
        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            if (component.types.includes('locality')) {
              cityName = component.longText;
              break;
            }
          }
          // Fallback to administrative_area_level_3 if locality not found
          if (!cityName) {
            for (const component of place.addressComponents) {
              if (component.types.includes('administrative_area_level_3')) {
                cityName = component.longText;
                break;
              }
            }
          }
        }

        // Use the prediction description if no city name extracted
        if (!cityName) {
          cityName = prediction.description.split(',')[0].trim();
        }

        form.setValue('city', cityName);
        setCitySearchText(cityName);
        resetSessionToken();
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      // Fallback: use the first part of description
      const fallbackCity = prediction.description.split(',')[0].trim();
      form.setValue('city', fallbackCity);
      setCitySearchText(fallbackCity);
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  // Keyboard navigation for city dropdown
  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCityDropdownOpen || predictions.length === 0) {
      if (e.key === 'Escape') {
        setIsCityDropdownOpen(false);
        cityInputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
          void handleSelectCity(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsCityDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Fetch city predictions with debounce
  useEffect(() => {
    if (!placesLibraryLoaded || !citySearchText || citySearchText.length < 2) {
      setPredictions([]);
      setIsCityDropdownOpen(false);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      const requestId = ++lastRequestId.current;
      setIsLoadingPredictions(true);

      const maps = (window as any).google?.maps;
      if (!maps?.places?.AutocompleteSuggestion) {
        setIsLoadingPredictions(false);
        return;
      }

      try {
        const sessionToken = getSessionToken();
        const request = {
          input: citySearchText,
          types: ['(cities)'],
          sessionToken,
        };

        const { suggestions } = await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (requestId !== lastRequestId.current) {
          return;
        }

        setIsLoadingPredictions(false);

        if (Array.isArray(suggestions)) {
          const mappedPredictions: PlacePrediction[] = suggestions.slice(0, 5).map((suggestion: {
            placePrediction: {
              text: { text?: string } | string;
              placeId: string;
            };
          }) => {
            const placePrediction = suggestion.placePrediction;
            return {
              description: typeof placePrediction.text === 'object'
                ? placePrediction.text.text || placePrediction.text.toString()
                : placePrediction.text.toString(),
              place_id: placePrediction.placeId,
              placePrediction: placePrediction as PlacePrediction['placePrediction'],
            };
          });
          setPredictions(mappedPredictions);
          setIsCityDropdownOpen(mappedPredictions.length > 0);
          setHighlightedIndex(-1);
        } else {
          setPredictions([]);
          setIsCityDropdownOpen(false);
        }
      } catch (error) {
        if (requestId !== lastRequestId.current) {
          return;
        }
        setIsLoadingPredictions(false);
        setPredictions([]);
        setIsCityDropdownOpen(false);
      }
    }, 350);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [citySearchText, placesLibraryLoaded, getSessionToken]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(e.target as Node) &&
        cityInputRef.current &&
        !cityInputRef.current.contains(e.target as Node)
      ) {
        setIsCityDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-fill city from IP location for new users
  useEffect(() => {
    if (ipLocationReady && ipLocation?.city && !form.getValues('city')) {
      form.setValue('city', ipLocation.city);
      setCitySearchText(ipLocation.city);
    }
  }, [ipLocationReady, ipLocation, form]);

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

        // Detect new user: phone is required, so null phone = never completed profile
        if (!profile.phone) {
          setIsNewUser(true);
        }

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
          mainRole: sanitizeMainRole(profile.main_role),
        });

        // Sync city search text with loaded profile city
        if (profile.city) {
          setCitySearchText(profile.city);
        }

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

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      let photoUrl = photoPreview;

      if (photoFile) {
        const uploadedUrl = await uploadPhoto(user.id);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      return profilesApi.updateProfile(user.id, {
        first_name: values.firstName,
        last_name: values.lastName || "",
        phone: values.phone,
        bio: values.bio || "",
        city: values.city || "",
        main_role: values.mainRole,
        photo_url: photoUrl || undefined,
      });
    },
    onSuccess: () => {
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
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateProfileMutation.mutate(values);
  });

  const triggerFilePicker = () => {
    if (updateProfileMutation.isPending || isUploadingPhoto) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="border-primary/10 shadow-lg">
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
                          disabled={updateProfileMutation.isPending || isUploadingPhoto}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={triggerFilePicker}
                        className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-primary/20 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        disabled={updateProfileMutation.isPending || isUploadingPhoto}
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
                        disabled={updateProfileMutation.isPending || isUploadingPhoto}
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
                            disabled={updateProfileMutation.isPending}
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
                            disabled={updateProfileMutation.isPending}
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
                            disabled={updateProfileMutation.isPending}
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
                      <FormItem className="space-y-2 relative">
                        <FormLabel htmlFor="city">Città</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              ref={cityInputRef}
                              id="city"
                              type="text"
                              placeholder="Milano, Roma, Torino..."
                              disabled={updateProfileMutation.isPending}
                              className="rounded-xl pr-9"
                              value={citySearchText || field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCitySearchText(value);
                                field.onChange(value);
                                if (value.length >= 2) {
                                  setIsCityDropdownOpen(true);
                                }
                              }}
                              onFocus={() => {
                                if (predictions.length > 0) {
                                  setIsCityDropdownOpen(true);
                                }
                              }}
                              onKeyDown={handleCityKeyDown}
                            />
                            {isLoadingPredictions && (
                              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                            )}
                            {isCityDropdownOpen && predictions.length > 0 && (
                              <div
                                ref={cityDropdownRef}
                                className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                              >
                                <ul className="py-1">
                                  {predictions.map((prediction, index) => (
                                    <li
                                      key={prediction.place_id}
                                      tabIndex={0}
                                      onClick={() => void handleSelectCity(prediction)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          void handleSelectCity(prediction);
                                        }
                                      }}
                                      onMouseEnter={() => setHighlightedIndex(index)}
                                      className={cn(
                                        'cursor-pointer px-3 py-2 text-sm',
                                        highlightedIndex === index
                                          ? 'bg-accent text-accent-foreground'
                                          : 'hover:bg-accent hover:text-accent-foreground'
                                      )}
                                      aria-selected={highlightedIndex === index}
                                      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <explanation>
                                      role="option"
                                    >
                                      {prediction.description}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
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
                        disabled={updateProfileMutation.isPending}
                      >
                        <SelectTrigger id="mainRole" className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">Base</SelectItem>
                          <SelectItem value="flyer">Flyer</SelectItem>
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
                          disabled={updateProfileMutation.isPending}
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
                  disabled={updateProfileMutation.isPending || isUploadingPhoto}
                >
                  {(updateProfileMutation.isPending || isUploadingPhoto) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploadingPhoto ? "Caricamento foto..." : "Salva profilo"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <EmailPreferencesCard isNewUser={isNewUser} />
      </div>
    </div>
  );
};

export default ProfileSetup;
