import { splitGap } from './split-gap'

describe('splitGap', () => {
  it('acima do total', () => {
    expect(splitGap(100, ['60', '50'])).toEqual({
      direction: 'over',
      difference: 10,
    })
  })

  it('abaixo do total, por um centésimo', () => {
    expect(splitGap(100, ['33,33', '33,33', '33,33'])).toEqual({
      direction: 'under',
      difference: 0.01,
    })
  })

  it('fecha', () => {
    expect(splitGap(100, ['50', '50']).direction).toBeNull()
    expect(splitGap(95, ['31,67', '31,67', '31,66']).direction).toBeNull()
  })

  it('vazio ou inválido conta zero', () => {
    expect(splitGap(100, ['60', '', 'abc'])).toEqual({
      direction: 'under',
      difference: 40,
    })
  })
})
