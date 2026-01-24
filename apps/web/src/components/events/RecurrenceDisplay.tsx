import { rrulestr } from 'rrule';

const ITALIAN_LANGUAGE = {
  dayNames: [
    'Domenica',
    'Lunedì',
    'Martedì',
    'Mercoledì',
    'Giovedì',
    'Venerdì',
    'Sabato',
  ],
  monthNames: [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ],
  tokens: {},
};

const ITALIAN_GETTEXT: Record<string, string> = {
  every: 'ogni',
  until: 'fino al',
  for: 'per',
  times: 'volte',
  time: 'volta',
  '(~ approximate)': '(~ approssimativo)',
  hours: 'ore',
  hour: 'ora',
  minutes: 'minuti',
  minute: 'minuto',
  weekdays: 'giorni feriali',
  weekday: 'giorno feriale',
  days: 'giorni',
  day: 'giorno',
  in: 'in',
  weeks: 'settimane',
  week: 'settimana',
  on: 'di',
  months: 'mesi',
  month: 'mese',
  years: 'anni',
  year: 'anno',
  'on the': 'il',
  and: 'e',
  or: 'o',
  the: 'il',
  at: 'alle',
  last: 'ultimo',
  st: '°',
  nd: '°',
  rd: '°',
  th: '°',
};

const italianGetText = (id: string) => ITALIAN_GETTEXT[id] || id;
const italianDateFormatter = (year: number, month: string, day: number) => `${day} ${month} ${year}`;

interface RecurrenceDisplayProps {
  recurrenceRule: string | null | undefined;
  recurrenceDtstart: string | null | undefined;
}

export function RecurrenceDisplay({ recurrenceRule, recurrenceDtstart }: RecurrenceDisplayProps) {
  if (!recurrenceRule || !recurrenceDtstart) {
    return null;
  }

  try {
    const rule = rrulestr(recurrenceRule, {
      dtstart: new Date(recurrenceDtstart)
    });

    // Generate human-readable text
    const text = rule.toText(italianGetText, ITALIAN_LANGUAGE, italianDateFormatter);

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          role="img"
        >
          <title>Ricorrenza</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>Si ripete {text}</span>
      </div>
    );
  } catch (error) {
    console.error('Invalid RRULE:', error);
    return null;
  }
}
