import { useDebouncedCallback } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { useEventFilters } from '@/hooks/useEventFilters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function KeywordSearch() {
  const { t } = useTranslation('events');
  const { filters, updateFilter } = useEventFilters();

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilter('query', term);
  }, 300);

  return (
    <div className="space-y-2">
      <Label htmlFor="keyword-search" className="text-sm font-medium">
        Cerca Eventi
      </Label>
      <Input
        id="keyword-search"
        type="search"
        placeholder={t('filters.searchPlaceholder')}
        defaultValue={filters.query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full"
      />
      {filters.query && (
        <p className="text-xs text-muted-foreground">
          Ricerca per: "{filters.query}"
        </p>
      )}
    </div>
  );
}
