import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDownIcon } from "lucide-react";
import { formatDateForDisplay } from "@/lib/jam-form";

type DateTimePickerProps = {
  label: string;
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  timeId: string;
  dateButtonId: string;
};

export const DateTimePicker = ({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  error,
  disabled,
  minDate,
  timeId,
  dateButtonId,
}: DateTimePickerProps) => {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    setOpen(false);
  };

  const defaultTime = label.includes("Inizio") ? "09:00" : "13:00";

  return (
    <div className="space-y-2">
      <Label htmlFor={dateButtonId}>
        {label.includes("Inizio") && <CalendarIcon className="inline h-4 w-4 mr-1" />}
        {label}
      </Label>
      <div className="flex gap-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={dateButtonId}
              className="flex-1 min-w-48 justify-between font-normal rounded-xl"
              disabled={disabled}
            >
              {date ? formatDateForDisplay(date, "it-IT") : "Seleziona una data"}
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={minDate ? { before: minDate } : undefined}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          id={timeId}
          value={time}
          onChange={(e) => onTimeChange(e.target.value || defaultTime)}
          disabled={disabled}
          className="rounded-xl bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

