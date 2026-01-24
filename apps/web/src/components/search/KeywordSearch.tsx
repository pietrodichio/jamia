import { useDebouncedCallback } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { useEventFilters } from '@/hooks/useEventFilters';
import { Input } from '@/components/ui/input';

export function KeywordSearch() {
  const { t } = useTranslation('events');
  const { filters, updateFilter } = useEventFilters();

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilter('query', term);
  }, 300);

  return (
    <Input
      id="keyword-search"
      type="search"
      placeholder={t('filters.searchPlaceholder')}
      defaultValue={filters.query}
      onChange={(e) => handleSearch(e.target.value)}
      className="h-9 w-full max-w-[300px]"
    />
  );
}
