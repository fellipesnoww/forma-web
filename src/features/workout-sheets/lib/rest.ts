/** 90 → "1:30", 45 → "0:45". */
export function formatRest(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
