/** GET /exercises only returns the muscle group's display name, not its slug —
 * derive one so filter chips and the custom-exercise form can reference the group. */
export function toMuscleGroupSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
