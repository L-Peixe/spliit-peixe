import { splittingFromGroup } from './group-defaults'

function group(
  defaultSplitMode: 'EVENLY' | 'BY_PERCENTAGE' | 'BY_SHARES',
  shares: number[],
) {
  return {
    defaultSplitMode,
    participants: shares.map((defaultShares, i) => ({
      id: `p${i}`,
      name: `Pessoa ${i}`,
      defaultShares,
    })),
  }
}

describe('splittingFromGroup', () => {
  it('igualmente: todos com uma parte', () => {
    expect(splittingFromGroup(group('EVENLY', [100, 100, 100]))).toEqual({
      splitMode: 'EVENLY',
      paidFor: [
        { participant: 'p0', shares: '1' },
        { participant: 'p1', shares: '1' },
        { participant: 'p2', shares: '1' },
      ],
    })
  })

  it('25/75 vira porcentagem 25 e 75', () => {
    expect(splittingFromGroup(group('BY_PERCENTAGE', [2500, 7500]))).toEqual({
      splitMode: 'BY_PERCENTAGE',
      paidFor: [
        { participant: 'p0', shares: '25' },
        { participant: 'p1', shares: '75' },
      ],
    })
  })

  it('partes 1:3', () => {
    expect(splittingFromGroup(group('BY_SHARES', [100, 300]))).toEqual({
      splitMode: 'BY_SHARES',
      paidFor: [
        { participant: 'p0', shares: '1' },
        { participant: 'p1', shares: '3' },
      ],
    })
  })

  it('deixa de fora quem está com 0% (a despesa recusa parte zero)', () => {
    expect(
      splittingFromGroup(group('BY_PERCENTAGE', [10000, 0])).paidFor,
    ).toEqual([{ participant: 'p0', shares: '100' }])
  })

  it('grupo antigo ignora as partes guardadas', () => {
    expect(splittingFromGroup(group('EVENLY', [100, 0])).paidFor).toEqual([
      { participant: 'p0', shares: '1' },
      { participant: 'p1', shares: '1' },
    ])
  })
})
