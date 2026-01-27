import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HamburgerMenu } from '../HamburgerMenu';

describe('HamburgerMenu', () => {
  it('renders hamburger menu button', () => {
    render(<HamburgerMenu />);
    
    const menuButton = screen.getByTitle('Menu');
    expect(menuButton).toBeInTheDocument();
  });

  it('opens menu when clicked', () => {
    render(<HamburgerMenu />);
    
    const menuButton = screen.getByTitle('Menu');
    fireEvent.click(menuButton);
    
    expect(screen.getByText('About SwasthyaTrack')).toBeInTheDocument();
    expect(screen.getByText('Disclaimer')).toBeInTheDocument();
    expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });

  it('opens about modal when About SwasthyaTrack is clicked', () => {
    render(<HamburgerMenu />);
    
    const menuButton = screen.getByTitle('Menu');
    fireEvent.click(menuButton);
    
    const aboutButton = screen.getByText('About SwasthyaTrack');
    fireEvent.click(aboutButton);
    
    expect(screen.getByText('A School Health Monitoring & Wellness Tracking System')).toBeInTheDocument();
  });
});