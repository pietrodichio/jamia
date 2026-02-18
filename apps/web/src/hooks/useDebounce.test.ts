import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately without waiting for delay', () => {
    const { result } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    expect(result.current).toBe('hello');
  });

  it('does not update value before delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });

    // Advance only partway through the delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Value should still be the original
    expect(result.current).toBe('hello');
  });

  it('updates value after full delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    rerender({ value: 'world', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('world');
  });

  it('resets timer on rapid changes and uses only last value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    );

    // Rapid successive changes
    rerender({ value: 'a', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(200); // Partway through
    });

    // Change again before timer fires
    rerender({ value: 'b', delay: 500 });

    // Advance past initial 500ms from first change (total 700ms from start)
    act(() => {
      vi.advanceTimersByTime(300); // 200 + 300 = 500ms but timer was reset at 200ms
    });

    // 'a' timer was reset, 'b' timer needs 500ms from when it was set
    // We've only given it 300ms so it should still be 'hello'
    expect(result.current).toBe('hello');

    // Complete the remaining time for 'b'
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('b');
  });

  it('handles numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });
});
