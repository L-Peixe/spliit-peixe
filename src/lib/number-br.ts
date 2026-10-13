// Numbers as typed in Brazil (ADR-010): comma for decimals, dot for thousands.

export type ParsedNumber =
  | { ok: true; value: number }
  | { ok: false; error: 'invalidNumber' | 'useComma' }

const BR = /^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/
// A dot not followed by groups of three digits is a decimal dot: never read
// `12.50` as 1.250 nor as 12,50 silently.
const DOT_DECIMAL = /^-?\d+\.\d+$/

export function parseNumberBR(text: string): ParsedNumber {
  const trimmed = text.trim()
  if (BR.test(trimmed))
    return {
      ok: true,
      value: Number(trimmed.replace(/\./g, '').replace(',', '.')),
    }
  return {
    ok: false,
    error: DOT_DECIMAL.test(trimmed) ? 'useComma' : 'invalidNumber',
  }
}

/** A form value as a number: numbers pass through, invalid text is NaN. */
export function numberBR(value: unknown): number {
  if (typeof value === 'number') return value
  const parsed = parseNumberBR(String(value ?? ''))
  return parsed.ok ? parsed.value : NaN
}

/** A value to pre-fill an input with: `33,33`, `12,50`, no thousands dot. */
export function formatNumberBR(value: number, fractionDigits?: number): string {
  return value.toLocaleString('pt-BR', {
    useGrouping: false,
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  })
}
