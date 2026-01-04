import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the supabase client module
const mockOn = vi.fn();
const mockSubscribe = vi.fn().mockResolvedValue(undefined);
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  default: {
    channel: () => ({
      on: mockOn,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    }),
  },
}));

import useRealtimeDashboard from '@/hooks/useRealtimeDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useRealtimeDashboard', () => {
  it('subscribes to tables and unsubscribes on unmount', async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { unmount } = renderHook(() => useRealtimeDashboard(true), { wrapper });

    // Each table should attach a listener
    // There are 5 tables in DASHBOARD_TABLES
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
