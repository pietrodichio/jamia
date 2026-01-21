import { rrulestr } from 'rrule';

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
    const text = rule.toText();

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Repeats {text}</span>
      </div>
    );
  } catch (error) {
    console.error('Invalid RRULE:', error);
    return null;
  }
}
