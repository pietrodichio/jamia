import { useEventFilters } from '@/hooks/useEventFilters';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { EVENT_TAG_OPTIONS } from '@/lib/event-tags';
import type { EventType } from '@jamia/types/event';

const EVENT_TYPES = [
    { value: 'jam', label: 'Jam' },
    { value: 'class', label: 'Lezione' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'convention', label: 'Convention' },
] as const;

export function UnifiedFilters() {
    const {
        filters,
        tags,
        setTags,
        updateFilter,
        clearFilters,
    } = useEventFilters();


    const handleTypesChange = (newTypes: string[]) => {
        updateFilter('type', newTypes as EventType[]);
    };

    const hasActiveFilters =
        filters.types.length > 0 ||
        tags.length > 0;

    return (
        <div className="flex flex-nowrap items-center gap-x-2 w-full">
            <MultiSelect
                options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                selected={filters.types}
                onChange={handleTypesChange}
                placeholder="Tipo di evento"
                className="flex-1 min-w-0 sm:min-w-[160px] sm:flex-none"
            />
            <MultiSelect
                options={EVENT_TAG_OPTIONS}
                selected={tags}
                onChange={setTags}
                placeholder="Tag"
                className="flex-1 min-w-0 sm:min-w-[160px] sm:w-fit sm:flex-none"
            />
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-xs"
                >
                    Cancella tutto
                </Button>
            )}
        </div>
    );
}
