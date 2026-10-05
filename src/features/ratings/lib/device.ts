/** "Chrome 141 · macOS" from the user agent; what `POST /ratings` stores as `device` (max 120 chars). */
export function describeDevice(ua = navigator.userAgent): string {
  const browser =
    match(ua, /Edg\/(\d+)/, 'Edge') ??
    match(ua, /OPR\/(\d+)/, 'Opera') ??
    match(ua, /Firefox\/(\d+)/, 'Firefox') ??
    match(ua, /CriOS\/(\d+)/, 'Chrome') ??
    match(ua, /Chrome\/(\d+)/, 'Chrome') ??
    match(ua, /Version\/(\d+).*Safari/, 'Safari') ??
    'Navegador'

  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : null

  return (os ? `${browser} · ${os}` : browser).slice(0, 120)
}

function match(ua: string, re: RegExp, name: string) {
  const m = ua.match(re)
  return m ? `${name} ${m[1]}` : null
}
