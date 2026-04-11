// Emerson et al. (1975) equation for the fraction of total ammonia-nitrogen
// present as unionized (free) NH3, given pH and temperature (°C).
// pKa(T) = 0.09018 + 2729.92 / (T + 273.15)
// f_NH3  = 1 / (1 + 10^(pKa - pH))
export function freeNh3Fraction(phVal: number, tempC: number): number {
  const pKa = 0.09018 + 2729.92 / (tempC + 273.15);
  return 1 / (1 + Math.pow(10, pKa - phVal));
}

export function computeFreeNh3(nh3TotalPpm: number, phVal: number, tempC: number): number {
  return nh3TotalPpm * freeNh3Fraction(phVal, tempC);
}
