import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatsCard } from '../StatsCard';
import { Users } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('StatsCard', () => {
  it('renders with title and icon in compact layout', () => {
    const { container } = render(
      <StatsCard
        title="Test Stat"
        value={123}
        icon={Users}
      />
    );
    
    expect(screen.getByText('Test Stat')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    // Check that the SVG icon is rendered
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with lastUpdated timestamp', () => {
    render(
      <StatsCard
        title="Test Stat"
        value={456}
        icon={Users}
        lastUpdated="12:34:56"
      />
    );
    
    expect(screen.getByText('Updated: 12:34:56')).toBeInTheDocument();
  });

  it('renders without lastUpdated when not provided', () => {
    render(
      <StatsCard
        title="Test Stat"
        value={789}
        icon={Users}
      />
    );
    
    expect(screen.queryByText(/Updated:/)).not.toBeInTheDocument();
  });
});