import { useEffect, useState } from 'react';
import { rrulestr } from 'rrule';

export function useEventOccurrences(
  recurrenceRule: string | null | undefined,
  recurrenceDtstart: string | null | undefined,
  rangeStart?: Date,
  rangeEnd?: Date
): Date[] {
  const [occurrences, setOccurrences] = useState<Date[]>([]);

  useEffect(() => {
    if (!recurrenceRule || !recurrenceDtstart) {
      setOccurrences([]);
      return;
    }

    try {
      const rule = rrulestr(recurrenceRule, {
        dtstart: new Date(recurrenceDtstart)
      });

      let dates: Date[];
      if (rangeStart && rangeEnd) {
        dates = rule.between(rangeStart, rangeEnd, true);
      } else {
        // Get next 10 occurrences for preview
        dates = rule.all((date, i) => i < 10);
      }

      setOccurrences(dates);
    } catch (error) {
      console.error('Invalid RRULE:', error);
      setOccurrences([]);
    }
  }, [recurrenceRule, recurrenceDtstart, rangeStart, rangeEnd]);

  return occurrences;
}
