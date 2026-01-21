import { useEventFilters } from '@/hooks/useEventFilters';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { EventType } from '@jamia/types/event';

const EVENT_TYPES = [
  { value: 'jam', label: 'Jam' },
  { value: 'class', label: 'Class' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'convention', label: 'Convention' },
] as const;

export function EventFilters() {
  const { filters, updateFilter, clearFilters } = useEventFilters();

  const handleTypeToggle = (type: EventType) => {
    const currentTypes = filters.types;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    updateFilter('type', newTypes);
  };

  const handleDateFromChange = (value: string) => {
    updateFilter('dateFrom', value);
  };

  const handleDateToChange = (value: string) => {
    updateFilter('dateTo', value);
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
        <Label className="text-lg font-semibold">Filters</Label>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Event Type Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Event Type</Label>
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
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        {filters.dateFrom && filters.dateTo && (
          <p className="text-xs text-muted-foreground">
            Showing events from {filters.dateFrom} to {filters.dateTo}
          </p>
        )}
      </div>
    </div>
  );
}
