import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { createTestQueryClient } from '@/test/render-utils';
import { server } from '@/test/msw-server';
import { useIpLocation } from './useIpLocation';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useIpLocation', () => {
  it('returns location data on success', async () => {
    // Default MSW handler returns Roma coords (configured in msw-handlers.ts)
    const { result } = renderHook(() => useIpLocation(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.lat).toBe(41.9028);
    expect(result.current.data?.lng).toBe(12.4964);
    expect(result.current.data?.city).toBe('Roma');
  });

  it('returns isApproximate: true', async () => {
    const { result } = renderHook(() => useIpLocation(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.isApproximate).toBe(true);
  });

  it('handles API error without crashing', async () => {
    // Override the MSW handler for this test only to simulate a network error
    server.use(
      http.get('https://ipapi.co/json/', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useIpLocation(), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      // useIpLocation has retry: 1, so it retries once before setting isError
      expect(result.current.isError).toBe(true);
    }, { timeout: 5000 });

    expect(result.current.data).toBeUndefined();
  });
});
