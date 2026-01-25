import '@testing-library/jest-dom';

// Mock Canvas API for CAPTCHA tests
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textAlign = 'start';
  textBaseline = 'alphabetic';

  clearRect() {}
  fillRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  fillText() {}
  arc() {}
  fill() {}
}

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: (contextType: string) => {
    if (contextType === '2d') {
      return new MockCanvasRenderingContext2D();
    }
    return null;
  },
});

// Mock canvas dimensions
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  value: 200,
  writable: true,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  value: 60,
  writable: true,
});