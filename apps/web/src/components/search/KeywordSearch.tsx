import { useDebouncedCallback } from 'use-debounce';
import { useEventFilters } from '@/hooks/useEventFilters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function KeywordSearch() {
  const { filters, updateFilter } = useEventFilters();

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilter('query', term);
  }, 300);

  return (
    <div className="space-y-2">
      <Label htmlFor="keyword-search" className="text-sm font-medium">
        Search Events
      </Label>
      <Input
        id="keyword-search"
        type="search"
        placeholder="Search events by title or description..."
        defaultValue={filters.query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full"
      />
      {filters.query && (
        <p className="text-xs text-muted-foreground">
          Searching for: "{filters.query}"
        </p>
      )}
    </div>
  );
}
