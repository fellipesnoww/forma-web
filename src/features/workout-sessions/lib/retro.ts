/**
 * Run screen in backdated mode, from "Lançar registro": `at` is a local `YYYY-MM-DDTHH:mm`,
 * `weekday` picks the sheet day (0 = Sunday).
 */
export function retroRunPath(sheetId: string, at: string, durationMinutes: number, weekday: number) {
  const params = new URLSearchParams({ retro: '1', at, duration: String(durationMinutes), weekday: String(weekday) })
  return `/app/sheets/${sheetId}/run?${params}`
}
