import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useEventFilters } from './useEventFilters';

function createWrapper(initialEntries: string[] = ['/']) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries }, children);
  };
}

describe('useEventFilters', () => {
  it('returns default filter values from empty URL', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/'])
    });

    expect(result.current.filters.query).toBe('');
    expect(result.current.filters.radius).toBe('50');
    expect(result.current.filters.types).toEqual([]);
    expect(result.current.filters.dateFrom).toBe('');
    expect(result.current.filters.dateTo).toBe('');
    expect(result.current.filters.lat).toBe('');
    expect(result.current.filters.lng).toBe('');
    expect(result.current.tags).toEqual([]);
  });

  it('reads existing query and radius from URL params', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/?query=yoga&radius=100'])
    });

    expect(result.current.filters.query).toBe('yoga');
    expect(result.current.filters.radius).toBe('100');
  });

  it('reads existing types from URL params', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/?type=jam&type=workshop'])
    });

    expect(result.current.filters.types).toContain('jam');
    expect(result.current.filters.types).toContain('workshop');
    expect(result.current.filters.types).toHaveLength(2);
  });

  it('updateFilter sets a string param', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/'])
    });

    act(() => {
      result.current.updateFilter('query', 'acro');
    });

    expect(result.current.filters.query).toBe('acro');
  });

  it('updateFilter sets array params (types)', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/'])
    });

    act(() => {
      result.current.updateFilter('type', ['jam', 'workshop']);
    });

    expect(result.current.filters.types).toContain('jam');
    expect(result.current.filters.types).toContain('workshop');
    expect(result.current.filters.types).toHaveLength(2);
  });

  it('updateFilter removes param when value is empty string', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/?query=yoga'])
    });

    act(() => {
      result.current.updateFilter('query', '');
    });

    expect(result.current.filters.query).toBe('');
  });

  it('clearFilters removes all params and returns defaults', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/?query=yoga&type=jam&radius=100'])
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.query).toBe('');
    expect(result.current.filters.types).toEqual([]);
    expect(result.current.filters.radius).toBe('50');
  });

  it('setTags updates tag params', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/'])
    });

    act(() => {
      result.current.setTags(['beginner-friendly', 'mat-required']);
    });

    expect(result.current.tags).toContain('beginner-friendly');
    expect(result.current.tags).toContain('mat-required');
    expect(result.current.tags).toHaveLength(2);
  });

  it('reads existing tags from URL params', () => {
    const { result } = renderHook(() => useEventFilters(), {
      wrapper: createWrapper(['/?tag=beginner-friendly&tag=advanced'])
    });

    expect(result.current.tags).toContain('beginner-friendly');
    expect(result.current.tags).toContain('advanced');
    expect(result.current.tags).toHaveLength(2);
  });
});
