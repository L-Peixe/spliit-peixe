import {
  amountSplitMismatch,
  describeSplit,
  expenseDateFromInput,
  fullAmountTo,
  parseAmount,
  quickExpenseValues,
  splitFooter,
  suggestCategory,
} from './quick-expense'
import { expenseFormSchema } from './schemas'

function group(
  defaultSplitMode: 'EVENLY' | 'BY_PERCENTAGE' | 'BY_SHARES',
  shares: number[],
) {
  return {
    currency: 'R$',
    currencyCode: 'BRL',
    defaultSplitMode,
    participants: shares.map((defaultShares, i) => ({
      id: 'ab'[i],
      name: ['Ana', 'Beto'][i],
      defaultShares,
    })),
  }
}

describe('parseAmount', () => {
  it('aceita vírgula e ponto', () => {
    expect(parseAmount('12,50')).toBe(12.5)
    expect(parseAmount('12.50')).toBe(12.5)
    expect(parseAmount(' 7 ')).toBe(7)
  })
  it('recusa vazio, zero, negativo e texto', () => {
    for (const text of ['', '0', '-3', 'abc'])
      expect(parseAmount(text)).toBeNull()
  })
})

describe('suggestCategory', () => {
  it.each([
    ['Uber pra casa', 35],
    ['99 Táxi', 35],
    ['iFood jantar', 8],
    ["McDonald's", 8],
    ['Mercado', 9],
    ['ASSAI atacadista', 9],
    ['Carrefour', 9],
    ['Netflix', 2],
    ['Spotify', 2],
    ['Presente', 0],
    ['Paguei 990', 0],
  ])('%s → %i', (title, id) => {
    expect(suggestCategory(title)).toBe(id)
  })
})

describe('describeSplit', () => {
  const words = { evenly: 'igualmente', shares: 'por partes' }
  it('escreve o padrão do grupo', () => {
    expect(describeSplit(group('EVENLY', [100, 100]), words)).toBe('igualmente')
    expect(describeSplit(group('BY_PERCENTAGE', [2500, 7500]), words)).toBe(
      '25/75',
    )
    expect(describeSplit(group('BY_SHARES', [100, 300]), words)).toBe(
      'por partes',
    )
  })
})

describe('quickExpenseValues', () => {
  const base = {
    title: 'Mercado',
    amount: 100,
    paidBy: 'a',
    categoryId: 9,
    date: new Date('2026-10-13T12:00:00Z'),
  }

  it('25/75 em R$ 100: centavos e partes ×100', () => {
    const g = group('BY_PERCENTAGE', [2500, 7500])
    const values = quickExpenseValues({
      ...base,
      group: g,
      split: {
        splitMode: 'BY_PERCENTAGE',
        paidFor: [
          { participant: 'a', shares: '25' },
          { participant: 'b', shares: '75' },
        ],
      },
    })
    expect(values).toMatchObject({
      title: 'Mercado',
      amount: 10000,
      paidBy: 'a',
      category: 9,
      splitMode: 'BY_PERCENTAGE',
      paidFor: [
        { participant: 'a', shares: 2500 },
        { participant: 'b', shares: 7500 },
      ],
      isReimbursement: false,
      saveDefaultSplittingOptions: false,
      recurrenceRule: 'NONE',
    })
    expect(() => expenseFormSchema.parse(values)).not.toThrow()
  })

  it('valor total a receber: só o outro deve', () => {
    const values = quickExpenseValues({
      ...base,
      group: group('EVENLY', [100, 100]),
      split: fullAmountTo('b'),
    })
    expect(values.splitMode).toBe('EVENLY')
    expect(values.paidFor).toEqual([{ participant: 'b', shares: 100 }])
  })

  it('por valor: partes em centavos', () => {
    const values = quickExpenseValues({
      ...base,
      amount: 50,
      group: group('EVENLY', [100, 100]),
      split: {
        splitMode: 'BY_AMOUNT',
        paidFor: [
          { participant: 'a', shares: '30' },
          { participant: 'b', shares: '20' },
        ],
      },
    })
    expect(values.paidFor.map((p) => p.shares)).toEqual([3000, 2000])
    expect(() => expenseFormSchema.parse(values)).not.toThrow()
  })
})

describe('splitFooter', () => {
  it('porcentagem, valores e igualmente', () => {
    expect(splitFooter('BY_PERCENTAGE', 50, ['75', ''])).toEqual({
      done: 75,
      total: 100,
      left: 25,
      valid: false,
    })
    expect(splitFooter('BY_AMOUNT', 50, ['30', ''])).toEqual({
      done: 30,
      total: 50,
      left: 20,
      valid: false,
    })
    expect(splitFooter('EVENLY', 25, ['1', '1'])).toEqual({
      done: 2,
      total: 2,
      left: 12.5,
      valid: true,
    })
  })

  it('só vale o que o servidor aceita', () => {
    expect(splitFooter('BY_PERCENTAGE', 50, ['60', '40']).valid).toBe(true)
    // the server rounds each value: 3333 + 3333 + 3333 = 9999
    expect(
      splitFooter('BY_PERCENTAGE', 50, ['33.333', '33.333', '33.334']).valid,
    ).toBe(false)
    expect(splitFooter('BY_PERCENTAGE', 50, ['110', '-10']).valid).toBe(false)
    expect(splitFooter('BY_SHARES', 50, ['0.001', '']).valid).toBe(false)
    expect(splitFooter('BY_AMOUNT', 50, ['30', '20']).valid).toBe(true)
  })
})

describe('amountSplitMismatch', () => {
  it('divisão por valor que não fecha com o valor atual', () => {
    const split = {
      splitMode: 'BY_AMOUNT' as const,
      paidFor: [
        { participant: 'a', shares: '50' },
        { participant: 'b', shares: '50' },
      ],
    }
    expect(amountSplitMismatch(split, 100)).toBe(false)
    expect(amountSplitMismatch(split, 120)).toBe(true)
    expect(amountSplitMismatch({ ...split, splitMode: 'EVENLY' }, 120)).toBe(
      false,
    )
  })
})

describe('expenseDateFromInput', () => {
  it('mesma data em qualquer fuso, como o formulário completo', () => {
    expect(expenseDateFromInput('2026-10-13').toISOString()).toBe(
      '2026-10-13T00:00:00.000Z',
    )
  })
})
