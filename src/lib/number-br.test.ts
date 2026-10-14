import { formatNumberBR, numberBR, parseNumberBR } from './number-br'

describe('parseNumberBR', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['12,5', 12.5],
    ['1.000', 1000],
    ['1.000.000,01', 1000000.01],
    ['-12,50', -12.5],
    [' 7 ', 7],
    ['0,99', 0.99],
  ])('%s → %d', (text, value) => {
    expect(parseNumberBR(text)).toEqual({ ok: true, value })
  })

  it.each(['12.50', '1.2345', '0.5'])('%s pede vírgula', (text) => {
    expect(parseNumberBR(text)).toEqual({ ok: false, error: 'useComma' })
  })

  it.each(['', '  ', 'abc', '1,234.56', '1.23,4', '12,', ','])(
    '"%s" é inválido',
    (text) => {
      expect(parseNumberBR(text)).toEqual({ ok: false, error: 'invalidNumber' })
    },
  )
})

describe('numberBR', () => {
  it('número passa direto, texto inválido vira NaN', () => {
    expect(numberBR(5)).toBe(5)
    expect(numberBR('33,33')).toBe(33.33)
    expect(numberBR('12.50')).toBeNaN()
    expect(numberBR(undefined)).toBeNaN()
  })
})

describe('formatNumberBR', () => {
  it('vírgula decimal, sem ponto de milhar', () => {
    expect(formatNumberBR(33.33)).toBe('33,33')
    expect(formatNumberBR(12.5, 2)).toBe('12,50')
    expect(formatNumberBR(1)).toBe('1')
    expect(formatNumberBR(1234.5, 2)).toBe('1234,50')
  })
})
