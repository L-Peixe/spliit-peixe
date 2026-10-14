import { numberBR } from '@/lib/number-br'

/**
 * How far a split by percentage or by amount is from its total. Values are
 * as typed (pt-BR) and summed in hundredths, like the schema rounds them.
 */
export function splitGap(
  total: number,
  values: unknown[],
): { direction: 'over' | 'under' | null; difference: number } {
  const sum = values.reduce<number>((sum, value) => {
    const number = numberBR(value)
    return sum + (Number.isNaN(number) ? 0 : Math.round(number * 100))
  }, 0)
  const gap = sum - Math.round(total * 100)
  return {
    direction: gap > 0 ? 'over' : gap < 0 ? 'under' : null,
    difference: Math.abs(gap) / 100,
  }
}
