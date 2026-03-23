import { z } from "zod";

export const formatDateTimeLocalInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const parseDateTimeLocal = (dateTimeString: string): { date: Date | undefined; time: string } => {
  if (!dateTimeString || dateTimeString.length === 0) {
    return { date: undefined, time: "" };
  }

  try {
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) {
      return { date: undefined, time: "" };
    }

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;

    // Reset time to 00:00:00 to get just the date part
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    return { date: dateOnly, time };
  } catch {
    return { date: undefined, time: "" };
  }
};

export const combineDateTime = (date: Date | undefined, time: string): string => {
  if (!date) return "";

  const timeParts = time.split(":");
  const hours = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
  const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;

  const combinedDate = new Date(date);
  combinedDate.setHours(hours, minutes, 0, 0);

  return formatDateTimeLocalInput(combinedDate);
};

export const formatDateForDisplay = (date: Date, locale: string = "it-IT"): string => {
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const jamFormSchema = z
  .object({
    name: z.string().trim().min(1, "Il nome è obbligatorio."),
    location: z.object({
      description: z.string().trim().min(1, "Il luogo è obbligatorio."),
      place_id: z.string().trim().optional().or(z.literal("")).transform((val) => val || undefined),
      latitude: z
        .union([z.coerce.number(), z.nan().transform(() => undefined)])
        .optional(),
      longitude: z
        .union([z.coerce.number(), z.nan().transform(() => undefined)])
        .optional(),
      google_maps_url: z
        .string()
        .trim()
        .url("Inserisci un URL valido.")
        .optional()
        .or(z.literal(""))
        .transform((val) => val || undefined),
    }),
    starts_at: z.string().min(1, "La data di inizio è obbligatoria."),
    ends_at: z.string().min(1, "La data di fine è obbligatoria."),
    description: z.string().trim().optional(),
    capacity: z
      .union([z.coerce.number().positive("Deve essere maggiore di 0"), z.nan().transform(() => undefined)])
      .optional(),
    desired_bases_min: z
      .union([z.coerce.number().min(0), z.nan().transform(() => undefined)])
      .optional(),
    desired_bases_max: z
      .union([z.coerce.number().min(0), z.nan().transform(() => undefined)])
      .optional(),
    desired_flyers_min: z
      .union([z.coerce.number().min(0), z.nan().transform(() => undefined)])
      .optional(),
    desired_flyers_max: z
      .union([z.coerce.number().min(0), z.nan().transform(() => undefined)])
      .optional(),
    auto_promote: z.boolean(),
    public_participants: z.boolean(),
    telegram_notifications_enabled: z.boolean().optional(),
  })
  .refine((data) => {
    if (!data.starts_at || !data.ends_at) return true;
    const start = new Date(data.starts_at);
    const end = new Date(data.ends_at);
    return end > start;
  }, {
    message: "La data di fine deve essere successiva alla data di inizio.",
    path: ["ends_at"],
  });

export type JamFormValues = z.infer<typeof jamFormSchema>;

export const jamFormDefaults: JamFormValues = {
  name: "",
  location: {
    description: "",
    place_id: undefined,
    latitude: undefined,
    longitude: undefined,
    google_maps_url: undefined,
  },
  starts_at: "",
  ends_at: "",
  description: "",
  capacity: undefined,
  desired_bases_min: undefined,
  desired_bases_max: undefined,
  desired_flyers_min: undefined,
  desired_flyers_max: undefined,
  auto_promote: true,
  public_participants: true,
  telegram_notifications_enabled: true,
};
