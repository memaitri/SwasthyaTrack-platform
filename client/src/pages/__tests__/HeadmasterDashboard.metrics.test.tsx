import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HeadmasterDashboard from '@/pages/HeadmasterDashboard';

describe('HeadmasterDashboard metrics derived from dashboard data', () => {
  it('shows aggregated school metrics computed from class analytics and referral data', async () => {
    const client = new QueryClient();

    const fakeDashboard = {
      classAnalytics: [
        { classSection: '1-A', c7Cases: 2, c8Cases: 1, pendingReferrals: 1, completedReferrals: 0 },
        { classSection: '2-A', c7Cases: 0, c8Cases: 1, pendingReferrals: 0, completedReferrals: 1 },
      ],
      referralData: { totalReferrals: 2, pendingReferrals: 1, completedReferrals: 1 },
    };

    client.setQueryData(["/api/headmaster/dashboard", String(new Date().getMonth() + 1), String(new Date().getFullYear())], fakeDashboard);

    render(
      <QueryClientProvider client={client}>
        <HeadmasterDashboard />
      </QueryClientProvider>
    );

    // Metric cards should show aggregated values
    expect(await screen.findByText(/Total Classes/i)).toBeInTheDocument();
    expect(await screen.findByText(/C7\/C8 Cases/i)).toBeInTheDocument();
    // Check computed values are rendered (sum c7+c8 = 4)
    expect(screen.getByText(/4/)).toBeInTheDocument();
    // Referral counts
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});
