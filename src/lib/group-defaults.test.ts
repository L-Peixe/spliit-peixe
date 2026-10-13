import {
  describeGroupChanges,
  percentTotal,
  splittingFromGroup,
} from './group-defaults'

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

  it('porcentagem quebrada sai com vírgula', () => {
    expect(
      splittingFromGroup(group('BY_PERCENTAGE', [3333, 3333, 3334])).paidFor,
    ).toEqual([
      { participant: 'p0', shares: '33,33' },
      { participant: 'p1', shares: '33,33' },
      { participant: 'p2', shares: '33,34' },
    ])
  })

  it('grupo antigo ignora as partes guardadas', () => {
    expect(splittingFromGroup(group('EVENLY', [100, 0])).paidFor).toEqual([
      { participant: 'p0', shares: '1' },
      { participant: 'p1', shares: '1' },
    ])
  })
})

describe('describeGroupChanges', () => {
  const casa = {
    name: 'Casa',
    currencyCode: 'USD',
    defaultSplitMode: 'EVENLY' as const,
    participants: [
      { id: 'a', name: 'Ana', defaultShares: 100 },
      { id: 'b', name: 'Beto', defaultShares: 100 },
    ],
  }

  it('nada mudou → nada a registrar', () => {
    expect(describeGroupChanges(casa, casa)).toBeUndefined()
  })

  it('nome', () => {
    expect(describeGroupChanges(casa, { ...casa, name: 'Casa nova' })).toBe(
      'nome: Casa → Casa nova',
    )
  })

  it('moeda', () => {
    expect(describeGroupChanges(casa, { ...casa, currencyCode: 'BRL' })).toBe(
      'moeda: USD → BRL',
    )
  })

  it('entrou e saiu', () => {
    expect(
      describeGroupChanges(casa, {
        ...casa,
        participants: [
          casa.participants[0],
          { name: 'Caio', defaultShares: 100 },
        ],
      }),
    ).toBe('entrou: Caio; saiu: Beto')
  })

  it('divisão igualmente → porcentagem', () => {
    expect(
      describeGroupChanges(casa, {
        ...casa,
        defaultSplitMode: 'BY_PERCENTAGE',
        participants: [
          { ...casa.participants[0], defaultShares: 2500 },
          { ...casa.participants[1], defaultShares: 7500 },
        ],
      }),
    ).toBe('divisão: igualmente → 25% / 75%')
  })

  it('divisão porcentagem → partes, junto com o nome', () => {
    const before = {
      ...casa,
      defaultSplitMode: 'BY_PERCENTAGE' as const,
      participants: [
        { ...casa.participants[0], defaultShares: 2500 },
        { ...casa.participants[1], defaultShares: 7500 },
      ],
    }
    expect(
      describeGroupChanges(before, {
        ...before,
        name: 'Lar',
        defaultSplitMode: 'BY_SHARES',
        participants: [
          { ...casa.participants[0], defaultShares: 100 },
          { ...casa.participants[1], defaultShares: 300 },
        ],
      }),
    ).toBe('nome: Casa → Lar; divisão: 25% / 75% → partes 1 / 3')
  })

  it('renomear participante na divisão igual não inventa "divisão"', () => {
    expect(
      describeGroupChanges(casa, {
        ...casa,
        participants: [
          { ...casa.participants[0], name: 'Aninha' },
          casa.participants[1],
        ],
      }),
    ).toBeUndefined()
  })
})

describe('percentTotal', () => {
  it('soma como o schema: cada valor arredondado a 2 casas', () => {
    expect(percentTotal(['33,333', '33,333', '33,334'])).toBe(99.99)
    expect(percentTotal(['25', '75'])).toBe(100)
  })
})
