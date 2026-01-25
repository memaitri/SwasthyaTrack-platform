import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveVisitorStats } from '../LiveVisitorStats';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

describe('LiveVisitorStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock returns
    localStorageMock.getItem.mockReturnValue('0');
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three stat cards with compact layout', () => {
    render(<LiveVisitorStats />);
    
    expect(screen.getByText('Total Visitors')).toBeInTheDocument();
    expect(screen.getByText('Today\'s Visitors')).toBeInTheDocument();
    expect(screen.getByText('Page Interactions')).toBeInTheDocument();
  });

  it('displays the platform activity header', () => {
    render(<LiveVisitorStats />);
    
    expect(screen.getByText('Platform Activity')).toBeInTheDocument();
    expect(screen.getByText('Live usage statistics')).toBeInTheDocument();
  });

  it('shows the live indicator', () => {
    render(<LiveVisitorStats />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('initializes session tracking on mount', () => {
    render(<LiveVisitorStats />);
    
    // Should check for session ID
    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('swasthya_session_id');
    // Should increment stats for new session
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});