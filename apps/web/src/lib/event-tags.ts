export const EVENT_TAG_OPTIONS = [
  { value: 'beginner-friendly', label: 'Adatto ai principianti' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzato' },
  { value: 'outdoor', label: "All'aperto" },
  { value: 'indoor', label: 'Al chiuso' },
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'A pagamento' },
  { value: 'mat-required', label: 'Richiede materassino' },
  { value: 'bring-partner', label: 'Porta un partner' },
  { value: 'drop-in', label: 'Drop-in' },
  { value: 'pasti-inclusi', label: 'Pasti inclusi' },
  { value: 'alloggio-incluso', label: 'Alloggio incluso' },
] as const;

export const EVENT_TAG_LABELS = new Map(
  EVENT_TAG_OPTIONS.map(({ value, label }) => [value, label])
);
