declare module '@testing-library/react';
declare module '@testing-library/user-event';

// Minimal typings for jest-dom matcher used in tests
declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
  }
}

declare global {
  // Ensure module augmentation applies
  export {};
}
