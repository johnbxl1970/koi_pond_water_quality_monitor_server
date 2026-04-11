import { freeNh3Fraction, computeFreeNh3 } from './free-nh3';

describe('free NH3 calculation', () => {
  it('is near zero at low pH and low temperature', () => {
    expect(freeNh3Fraction(6.5, 15)).toBeLessThan(0.002);
  });

  it('rises sharply with pH', () => {
    const low = freeNh3Fraction(7.0, 25);
    const high = freeNh3Fraction(8.5, 25);
    expect(high).toBeGreaterThan(low * 20);
  });

  it('computes free NH3 in ppm', () => {
    // At pH 8, 25°C: Emerson fraction ~0.0553 → 1 ppm total → ~0.055 ppm free
    const v = computeFreeNh3(1.0, 8.0, 25);
    expect(v).toBeGreaterThan(0.04);
    expect(v).toBeLessThan(0.07);
  });
});
