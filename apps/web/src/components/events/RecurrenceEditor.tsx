import { RRule, Weekday } from 'rrule';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface RecurrenceEditorProps {
  value: { rule: string | null; dtstart: string | null; until: string | null };
  onChange: (value: { rule: string | null; dtstart: string | null; until: string | null }) => void;
  startsAt: string;  // Event start time (used as dtstart)
}

const WEEKDAYS = [
  { value: RRule.MO, label: 'Lun', fullLabel: 'Lunedì' },
  { value: RRule.TU, label: 'Mar', fullLabel: 'Martedì' },
  { value: RRule.WE, label: 'Mer', fullLabel: 'Mercoledì' },
  { value: RRule.TH, label: 'Gio', fullLabel: 'Giovedì' },
  { value: RRule.FR, label: 'Ven', fullLabel: 'Venerdì' },
  { value: RRule.SA, label: 'Sab', fullLabel: 'Sabato' },
  { value: RRule.SU, label: 'Dom', fullLabel: 'Domenica' },
];

const FREQ_LABELS: Record<Frequency, { singular: string; plural: string }> = {
  DAILY: { singular: 'giorno', plural: 'giorni' },
  WEEKLY: { singular: 'settimana', plural: 'settimane' },
  MONTHLY: { singular: 'mese', plural: 'mesi' },
};

export function RecurrenceEditor({ value, onChange, startsAt }: RecurrenceEditorProps) {
  const [enabled, setEnabled] = useState(!!value.rule);
  const [freq, setFreq] = useState<Frequency>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [until, setUntil] = useState<string>(value.until || '');
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([]);
  const [untilOpen, setUntilOpen] = useState(false);

  // Get the day of week from startsAt
  const startDate = startsAt ? new Date(startsAt) : null;
  const startDayIndex = startDate ? startDate.getDay() : null;
  // Convert JS day (0=Sun) to RRule day (0=Mon)
  const startRRuleDay = startDayIndex !== null
    ? WEEKDAYS[(startDayIndex + 6) % 7].value
    : null;

  // Initialize selected days from start date when enabling
  useEffect(() => {
    if (enabled && freq === 'WEEKLY' && selectedDays.length === 0 && startRRuleDay) {
      setSelectedDays([startRRuleDay]);
    }
  }, [enabled, freq, startRRuleDay, selectedDays.length]);

  const updateRule = () => {
    if (!enabled || !startsAt) return;

    try {
      const dtstart = new Date(startsAt);

      const ruleOptions: any = {
        freq: RRule[freq],
        interval,
        dtstart,
        until: until ? new Date(until) : undefined
      };

      // Add byweekday for weekly recurrence
      if (freq === 'WEEKLY' && selectedDays.length > 0) {
        ruleOptions.byweekday = selectedDays;
      }

      const rule = new RRule(ruleOptions);

      onChange({
        rule: rule.toString(),
        dtstart: dtstart.toISOString(),
        until: until || null
      });
    } catch (error) {
      console.error('Error generating RRULE:', error);
    }
  };

  // Update rule whenever parameters change
  // biome-ignore lint/correctness/useExhaustiveDependencies: <selectedDays will cause infinite loop>
  useEffect(() => {
    if (!enabled) return;
    updateRule();
  }, [enabled, freq, interval, until, startsAt, selectedDays]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange({ rule: null, dtstart: null, until: null });
      setSelectedDays([]);
    } else if (startRRuleDay) {
      setSelectedDays([startRRuleDay]);
    }
  };



  const handleFreqChange = (newFreq: string) => {
    setFreq(newFreq as Frequency);
    // Reset selected days when changing frequency
    if (newFreq === 'WEEKLY' && startRRuleDay) {
      setSelectedDays([startRRuleDay]);
    } else {
      setSelectedDays([]);
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(e.target.value) || 1;
    setInterval(Math.max(1, newInterval));
  };

  const handleUntilChange = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setUntil(dateString);
    } else {
      setUntil('');
    }
    setUntilOpen(false);
  };

  // Convert until string to Date object for Calendar
  const untilDate = until ? new Date(until) : undefined;

  const toggleDay = (day: Weekday) => {
    setSelectedDays(prev => {
      const isSelected = prev.some(d => d.weekday === day.weekday);
      if (isSelected) {
        // Don't allow deselecting the last day
        if (prev.length === 1) return prev;
        return prev.filter(d => d.weekday !== day.weekday);
      } else {
        return [...prev, day];
      }
    });
  };

  // Generate summary text
  const getSummaryText = () => {
    if (!enabled || !startDate) return '';

    const freqLabel = interval === 1
      ? FREQ_LABELS[freq].singular
      : FREQ_LABELS[freq].plural;

    let text = interval === 1
      ? `Ogni ${freqLabel}`
      : `Ogni ${interval} ${freqLabel}`;

    if (freq === 'WEEKLY' && selectedDays.length > 0) {
      const dayNames = selectedDays
        .sort((a, b) => a.weekday - b.weekday)
        .map(d => WEEKDAYS.find(w => w.value.weekday === d.weekday)?.fullLabel)
        .filter(Boolean);
      text += ` (${dayNames.join(', ')})`;
    }

    if (until) {
      text += ` fino al ${format(new Date(until), 'd MMMM yyyy', { locale: it })}`;
    }

    return text;
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="recurring"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="recurring" className="font-medium cursor-pointer">
          Evento ricorrente
        </Label>
      </div>

      {enabled && (
        <div className="space-y-4 pt-2">
          {/* Frequency selector */}
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm">Ripeti ogni</Label>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={handleIntervalChange}
              className="w-16 h-9"
            />
            <Select value={freq} onValueChange={handleFreqChange}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">
                  {interval === 1 ? 'Giorno' : 'Giorni'}
                </SelectItem>
                <SelectItem value="WEEKLY">
                  {interval === 1 ? 'Settimana' : 'Settimane'}
                </SelectItem>
                <SelectItem value="MONTHLY">
                  {interval === 1 ? 'Mese' : 'Mesi'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of week selector for weekly */}
          {freq === 'WEEKLY' && (
            <div className="space-y-2">
              <Label className="text-sm">Giorni della settimana</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const isSelected = selectedDays.some(d => d.weekday === day.value.weekday);
                  const isStartDay = startRRuleDay?.weekday === day.value.weekday;
                  return (
                    <button
                      key={day.label}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'w-10 h-10 rounded-full text-sm font-medium transition-colors',
                        'border-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-input hover:bg-accent hover:text-accent-foreground',
                        isStartDay && !isSelected && 'border-primary/50'
                      )}
                      title={day.fullLabel}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Seleziona uno o più giorni in cui l'evento si ripeterà
              </p>
            </div>
          )}

          {/* End date */}
          <div className="space-y-2">
            <Label htmlFor="until" className="text-sm">
              Fino a quando ripetere (opzionale)
            </Label>
            <Popover open={untilOpen} onOpenChange={setUntilOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="until"
                  variant="outline"
                  className={cn(
                    'w-48 justify-start text-left font-normal rounded-md',
                    !untilDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {untilDate ? format(untilDate, 'dd MMM yyyy', { locale: it }) : 'Seleziona data'}
                  <ChevronDownIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={untilDate}
                  onSelect={(date) => {
                    // Validate that until is after start date
                    if (startDate && date) {
                      if (date < startDate) {
                        return; // Don't allow dates before start
                      }
                    }
                    handleUntilChange(date);
                  }}
                  disabled={startDate ? { before: startDate } : undefined}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Lascia vuoto per una serie senza scadenza
            </p>
          </div>

          {/* Summary */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-primary">
              {getSummaryText()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
