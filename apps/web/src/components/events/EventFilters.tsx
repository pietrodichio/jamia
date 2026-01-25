import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useEventFilters } from '@/hooks/useEventFilters';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventType } from '@jamia/types/event';

const EVENT_TYPES = [
  { value: 'jam', label: 'Jam' },
  { value: 'class', label: 'Lezione' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'convention', label: 'Convention' },
] as const;

export function EventFilters() {
  const { t } = useTranslation(['common', 'events']);
  const { filters, updateFilter, clearFilters } = useEventFilters();
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const handleTypeToggle = (type: EventType) => {
    const currentTypes = filters.types;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    updateFilter('type', newTypes);
  };

  // Convert string dates to Date objects
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

  const handleDateFromChange = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      updateFilter('dateFrom', dateString);
    } else {
      updateFilter('dateFrom', '');
    }
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      updateFilter('dateTo', dateString);
    } else {
      updateFilter('dateTo', '');
    }
    setDateToOpen(false);
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.query ||
    filters.lat ||
    filters.lng;

  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Filtri</Label>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Cancella tutto
          </Button>
        )}
      </div>

      {/* Event Type Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Tipo di evento</Label>
        <div className="space-y-2">
          {EVENT_TYPES.map((eventType) => (
            <div key={eventType.value} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${eventType.value}`}
                checked={filters.types.includes(eventType.value as EventType)}
                onCheckedChange={() => handleTypeToggle(eventType.value as EventType)}
              />
              <Label
                htmlFor={`type-${eventType.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {eventType.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Intervallo date</Label>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              Da
            </Label>
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-from"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal rounded-md',
                    !dateFrom && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'dd MMM yyyy', { locale: it }) : 'Seleziona data'}
                  <ChevronDownIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={handleDateFromChange}
                  disabled={dateTo ? { after: dateTo } : undefined}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              A
            </Label>
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-to"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal rounded-md',
                    !dateTo && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'dd MMM yyyy', { locale: it }) : 'Seleziona data'}
                  <ChevronDownIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={handleDateToChange}
                  disabled={dateFrom ? { before: dateFrom } : undefined}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {filters.dateFrom && filters.dateTo && (
          <p className="text-xs text-muted-foreground">
            Mostrando eventi dal {format(dateFrom, 'dd MMM yyyy', { locale: it })} al {format(dateTo, 'dd MMM yyyy', { locale: it })}
          </p>
        )}
      </div>
    </div>
  );
}
