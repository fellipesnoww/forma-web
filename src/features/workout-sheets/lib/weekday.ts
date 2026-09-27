/** API convention: 0 = Sunday … 6 = Saturday. */
export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

/** Monday-first order for rendering the day picker, mapped back to API weekday ints. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
