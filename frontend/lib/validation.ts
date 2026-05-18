export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function validateStake(value: string): boolean {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0.001;
}
