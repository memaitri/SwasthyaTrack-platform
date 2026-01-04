import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';

// Mock wouter useParams and Link so the page thinks it's in view mode for a specific card
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'card-1' }),
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import HealthCardsPage from '../HealthCardsPage';
import { AuthProvider } from '../../lib/auth';

const queryClient = new QueryClient();

describe('HealthCardsPage (view mode)', () => {
  beforeEach(() => {
    // Provide a logged-in user in localStorage so AuthProvider picks it up
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', username: 'test', role: 'Admin' }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('renders a full health card when backend returns complete data', async () => {
    const fakeCard = {
      id: 'card-1',
      nameOfChild: 'Test Child',
      classSection: '3-A',
      year: 2025,
      weightKg: '30',
      heightCm: '130',
      bmi: '17.8',
      deficiencies: ['Anemia'],
      c7_suspected: true,
      notes: 'Some clinical notes',
      schoolName: 'Test School',
      status: 'Approved',
    };

    (globalThis as any).fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes(`/api/annual-cards/${fakeCard.id}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ card: fakeCard, student: { id: 's1', fullName: 'Test Child', classSection: '3-A' } }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HealthCardsPage />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Wait for the name to appear
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());

    // Basic info checks
    expect(screen.getByText(/Class/)).toBeInTheDocument();
    expect(screen.getByText('3-A')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();

    // Check deficiencies badge is rendered
    await waitFor(() => expect(screen.getByText('Anemia')).toBeInTheDocument());

    // Check disease warning shows for c7_suspected
    expect(screen.getByText(/Leprosy suspected/)).toBeInTheDocument();

    // Notes
    expect(screen.getByText('Some clinical notes')).toBeInTheDocument();
  });

  it('toggles full details and shows raw fields', async () => {
    const fakeCard = {
      id: 'card-1',
      nameOfChild: 'Test Child',
      classSection: '3-A',
      year: 2025,
      weightKg: '30',
      heightCm: '130',
    };

    (globalThis as any).fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes(`/api/annual-cards/${fakeCard.id}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ card: fakeCard, student: { id: 's1', fullName: 'Test Child', classSection: '3-A' } }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HealthCardsPage />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());

    const toggle = screen.getByRole('button', { name: /Show full details/i });
    // click the toggle
    toggle.click();

    // Wait for key to appear
    await waitFor(() => expect(screen.getByText('weightKg')).toBeInTheDocument());
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('shows empty fields when toggle enabled', async () => {
    const fakeCard = {
      id: 'card-1',
      nameOfChild: 'Test Child',
      classSection: '3-A',
      year: 2025,
      ageYears: 16,
      e1_life_events_difficulty: false,
    };

    (globalThis as any).fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes(`/api/annual-cards/${fakeCard.id}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ card: fakeCard, student: { id: 's1', fullName: 'Test Child', classSection: '3-A' } }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HealthCardsPage />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());

    const toggle = screen.getByRole('button', { name: /Show empty fields/i });
    // click the toggle
    toggle.click();

    // Wait for the empty field to appear with a formatted value
    await waitFor(() => expect(screen.getByText(/Difficulty managing life events:\s*No/i)).toBeInTheDocument());
  });

  it('shows the error UI when backend returns incomplete health card error', async () => {
    const incompleteResponse = { message: 'Incomplete health card data', missing: ['studentId', 'year'] };

    (globalThis as any).fetch = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/annual-cards/')) {
        return { ok: false, status: 500, statusText: 'Internal Server Error', json: async () => incompleteResponse } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HealthCardsPage />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Failed to load health card')).toBeInTheDocument());
    expect(screen.getByText(/An error occurred while fetching the health card/)).toBeInTheDocument();
  });
});
