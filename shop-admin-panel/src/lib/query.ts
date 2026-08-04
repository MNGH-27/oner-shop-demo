export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function toQuery(
  params: object,
): Record<string, string | number | boolean | undefined | null> {
  return params as Record<string, string | number | boolean | undefined | null>
}
