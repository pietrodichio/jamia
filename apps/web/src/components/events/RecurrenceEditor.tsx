import { RRule } from 'rrule';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface RecurrenceEditorProps {
  value: { rule: string | null; dtstart: string | null; until: string | null };
  onChange: (value: { rule: string | null; dtstart: string | null; until: string | null }) => void;
  startsAt: string;  // Event start time (used as dtstart)
}

export function RecurrenceEditor({ value, onChange, startsAt }: RecurrenceEditorProps) {
  const [enabled, setEnabled] = useState(!!value.rule);
  const [freq, setFreq] = useState<Frequency>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [until, setUntil] = useState<string>(value.until || '');

  // Update rule whenever parameters change
  useEffect(() => {
    if (!enabled) return;
    updateRule();
  }, [enabled, freq, interval, until, startsAt]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange({ rule: null, dtstart: null, until: null });
    }
  };

  const updateRule = () => {
    if (!enabled || !startsAt) return;

    try {
      const dtstart = new Date(startsAt);
      const rule = new RRule({
        freq: RRule[freq],
        interval,
        dtstart,
        until: until ? new Date(until) : undefined
      });

      onChange({
        rule: rule.toString(),
        dtstart: dtstart.toISOString(),
        until: until || null
      });
    } catch (error) {
      console.error('Error generating RRULE:', error);
    }
  };

  const handleFreqChange = (newFreq: string) => {
    setFreq(newFreq as Frequency);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(e.target.value) || 1;
    setInterval(newInterval);
  };

  const handleUntilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUntil(e.target.value);
  };

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="recurring"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="recurring" className="font-semibold">
          Recurring Event
        </Label>
      </div>

      {enabled && (
        <div className="space-y-4 pl-6">
          <div className="flex items-center gap-2">
            <Label>Repeat every:</Label>
            <Input
              type="number"
              min={1}
              value={interval}
              onChange={handleIntervalChange}
              className="w-20"
            />
            <Select value={freq} onValueChange={handleFreqChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Days</SelectItem>
                <SelectItem value="WEEKLY">Weeks</SelectItem>
                <SelectItem value="MONTHLY">Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="until">End date (optional):</Label>
            <Input
              id="until"
              type="date"
              value={until}
              onChange={handleUntilChange}
              className="w-48"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {interval === 1 ? 'Every' : `Every ${interval}`} {freq.toLowerCase()}
            {until && ` until ${new Date(until).toLocaleDateString()}`}
          </p>
        </div>
      )}
    </div>
  );
}
