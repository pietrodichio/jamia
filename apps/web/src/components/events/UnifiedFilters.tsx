import { useEventFilters } from '@/hooks/useEventFilters';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { EVENT_TAG_OPTIONS } from '@/lib/event-tags';
import type { EventType } from '@jamia/types/event';

const EVENT_TYPES = [
    { value: 'jam', label: 'Jam' },
    { value: 'class', label: 'Lezione' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'convention', label: 'Convegno' },
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
        <div className="flex flex-wrap items-center gap-2">
            <MultiSelect
                options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                selected={filters.types}
                onChange={handleTypesChange}
                placeholder="Tipo di evento"
                className="min-w-[160px]"
            />
            <MultiSelect
                options={EVENT_TAG_OPTIONS}
                selected={tags}
                onChange={setTags}
                placeholder="Tag"
                className="min-w-[160px] w-fit"
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
