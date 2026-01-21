import { useSearchParams } from 'react-router-dom';
import type { EventType } from '@jamia/types/event';

export function useEventFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    query: searchParams.get('query') || '',
    types: searchParams.getAll('type') as EventType[],
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    lat: searchParams.get('lat') || '',
    lng: searchParams.get('lng') || '',
    radius: searchParams.get('radius') || '50', // km
  };

  const tags = searchParams.getAll('tag');
  const accommodationOptions = searchParams.getAll('accommodation');
  const foodOptions = searchParams.getAll('food');

  const updateFilter = (key: string, value: string | string[]) => {
    const newParams = new URLSearchParams(searchParams);

    if (Array.isArray(value)) {
      newParams.delete(key);
      value.forEach(v => newParams.append(key, v));
    } else if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }

    setSearchParams(newParams, { replace: true });
  };

  const setTags = (newTags: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('tag');
    newTags.forEach(tag => newParams.append('tag', tag));
    setSearchParams(newParams, { replace: true });
  };

  const setAccommodationOptions = (options: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('accommodation');
    options.forEach(opt => newParams.append('accommodation', opt));
    setSearchParams(newParams, { replace: true });
  };

  const setFoodOptions = (options: string[]) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('food');
    options.forEach(opt => newParams.append('food', opt));
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  return {
    filters,
    updateFilter,
    clearFilters,
    tags,
    setTags,
    accommodationOptions,
    setAccommodationOptions,
    foodOptions,
    setFoodOptions,
  };
}
