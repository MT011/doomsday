export function hasCompleteLocation(state: string, city: string, cinemaName: string) {
  return Boolean(state && city && cinemaName);
}
