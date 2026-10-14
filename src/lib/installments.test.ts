import { installmentAmounts, installmentTitle } from './installments'

describe('installmentAmounts', () => {
  it('o centavo que sobra vai na 1ª', () => {
    expect(installmentAmounts(10000, 3)).toEqual([3334, 3333, 3333])
    expect(installmentAmounts(5, 3)).toEqual([3, 1, 1])
  })

  it('divisão exata', () => {
    expect(installmentAmounts(120000, 10)).toEqual(Array(10).fill(12000))
  })
})

describe('installmentTitle', () => {
  it('acrescenta o sufixo', () => {
    expect(installmentTitle('TV', 1, 3)).toBe('TV (1/3)')
  })

  it('troca o sufixo do fim', () => {
    expect(installmentTitle('TV (1/3)', 2, 3)).toBe('TV (2/3)')
  })

  it('apagou o sufixo: acrescenta de novo', () => {
    expect(installmentTitle('TV (parcela)', 2, 3)).toBe('TV (parcela) (2/3)')
  })
})
