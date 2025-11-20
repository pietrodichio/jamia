import { z } from "zod";

export const formatDateTimeLocalInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const jamFormSchema = z
  .object({
    name: z.string().trim().min(1, "Il nome è obbligatorio."),
    location_text: z.string().trim().min(1, "Il luogo è obbligatorio."),
    gmaps_link: z.string().trim().url("Inserisci un URL valido.").optional().or(z.literal("")),
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
  location_text: "",
  gmaps_link: "",
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
};
