import { expenseFormSchema, groupFormSchema } from './schemas'

function byAmountExpense(amount: string, shares: string[]) {
  return {
    expenseDate: new Date('2026-09-01'),
    title: 'Dinner',
    amount,
    paidBy: 'a',
    splitMode: 'BY_AMOUNT',
    saveDefaultSplittingOptions: false,
    isReimbursement: false,
    paidFor: shares.map((shares, i) => ({ participant: `p${i}`, shares })),
  }
}

function issueMessages(input: unknown): string[] {
  const result = expenseFormSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.message)
}

describe('expenseFormSchema, split by amount', () => {
  it('accepts amounts that add up to the expense amount', () => {
    expect(
      issueMessages(
        byAmountExpense('524,34', [
          '110,11',
          '209,74',
          '104,87',
          '89,14',
          '10,48',
        ]),
      ),
    ).toEqual([])
  })

  it('rejects amounts one cent off', () => {
    expect(
      issueMessages(
        byAmountExpense('524,34', [
          '110,11',
          '209,74',
          '104,87',
          '89,14',
          '10,49',
        ]),
      ),
    ).toEqual(['amountSum'])
  })

  it('sums amounts typed with a decimal comma', () => {
    expect(
      issueMessages(byAmountExpense('100', ['50', '30', '20,00'])),
    ).toEqual([])
  })

  it('reports an emptied amount instead of throwing on it', () => {
    expect(issueMessages(byAmountExpense('100', ['60', '']))).toEqual([
      'noZeroShares',
      'amountSum',
    ])
  })
})

describe('groupFormSchema, divisão padrão', () => {
  function group(
    defaultSplitMode: string | undefined,
    shares: (string | undefined)[],
  ) {
    return {
      name: 'Casa',
      currency: 'R$',
      currencyCode: 'BRL',
      ...(defaultSplitMode && { defaultSplitMode }),
      participants: shares.map((defaultShares, i) => ({
        name: `Pessoa ${i}`,
        ...(defaultShares !== undefined && { defaultShares }),
      })),
    }
  }

  function parse(input: unknown) {
    const result = groupFormSchema.safeParse(input)
    return {
      messages: result.success ? [] : result.error.issues.map((i) => i.message),
      shares: result.success
        ? result.data.participants.map((p) => p.defaultShares)
        : [],
      mode: result.success ? result.data.defaultSplitMode : undefined,
    }
  }

  it('aceita porcentagem que fecha 100%, guardada ×100', () => {
    expect(parse(group('BY_PERCENTAGE', ['25', '75']))).toEqual({
      messages: [],
      shares: [2500, 7500],
      mode: 'BY_PERCENTAGE',
    })
  })

  it('recusa porcentagem que não fecha 100%', () => {
    const result = groupFormSchema.safeParse(
      group('BY_PERCENTAGE', ['25', '65']),
    )
    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        message: 'percentageSum',
        path: ['participants'],
      }),
    ])
  })

  it('aceita vírgula decimal', () => {
    expect(parse(group('BY_PERCENTAGE', ['12,5', '87,5'])).shares).toEqual([
      1250, 8750,
    ])
  })

  it('aceita partes e recusa parte zero', () => {
    expect(parse(group('BY_SHARES', ['1', '3'])).shares).toEqual([100, 300])
    expect(parse(group('BY_SHARES', ['0', '1'])).messages).toEqual([
      'noZeroShares',
    ])
  })

  it('igualmente ignora os valores e guarda 100', () => {
    expect(parse(group('EVENLY', ['7', '0'])).shares).toEqual([100, 100])
  })

  it('não aceita divisão por valor como padrão', () => {
    expect(parse(group('BY_AMOUNT', ['1', '1'])).messages).not.toEqual([])
  })

  it('recusa porcentagem negativa', () => {
    expect(parse(group('BY_PERCENTAGE', ['120', '-20'])).messages).toEqual([
      'noZeroShares',
    ])
  })

  it('cliente antigo sem os campos novos vira igualmente', () => {
    expect(parse(group(undefined, [undefined, undefined]))).toEqual({
      messages: [],
      shares: [100, 100],
      mode: 'EVENLY',
    })
  })
})

describe('números como no Brasil', () => {
  const expense = (amount: string, shares: string[], splitMode = 'EVENLY') => ({
    ...byAmountExpense(amount, shares),
    splitMode,
  })

  it('valor com ponto de milhar e vírgula decimal', () => {
    const result = expenseFormSchema.safeParse(expense('1.234,56', ['1']))
    expect(result.data?.amount).toBe(1234.56)
  })

  it('12.50 pede vírgula em vez de virar outro número', () => {
    expect(issueMessages(expense('12.50', ['1']))).toEqual(['useComma'])
  })

  it('valor vazio pede o valor', () => {
    expect(issueMessages(expense('', ['1']))).toEqual(['amountRequired'])
  })

  it('porcentagens com vírgula viram ×100', () => {
    const result = expenseFormSchema.safeParse(
      expense('100', ['33,33', '33,33', '33,34'], 'BY_PERCENTAGE'),
    )
    expect(result.data?.paidFor.map((p) => p.shares)).toEqual([
      3333, 3333, 3334,
    ])
  })

  it('parte com ponto decimal pede vírgula', () => {
    expect(
      issueMessages(expense('100', ['50.5', '49,5'], 'BY_PERCENTAGE')),
    ).toContain('useComma')
  })

  it('parte do grupo com vírgula', () => {
    const result = groupFormSchema.safeParse({
      name: 'Casa',
      currency: 'R$',
      currencyCode: 'BRL',
      defaultSplitMode: 'BY_PERCENTAGE',
      participants: [
        { name: 'Ana', defaultShares: '25,5' },
        { name: 'Beto', defaultShares: '74,5' },
      ],
    })
    expect(result.data?.participants.map((p) => p.defaultShares)).toEqual([
      2550, 7450,
    ])
  })

  it('parte do grupo com ponto decimal pede vírgula', () => {
    const result = groupFormSchema.safeParse({
      name: 'Casa',
      currency: 'R$',
      currencyCode: 'BRL',
      defaultSplitMode: 'BY_PERCENTAGE',
      participants: [
        { name: 'Ana', defaultShares: '25.5' },
        { name: 'Beto', defaultShares: '74,5' },
      ],
    })
    expect(result.error?.issues.map((i) => i.message)).toContain('useComma')
  })
})

describe('parcelado', () => {
  const installment = (extra: Record<string, unknown>) =>
    issueMessages({
      ...byAmountExpense('100', ['1', '1']),
      splitMode: 'EVENLY',
      installmentCount: 3,
      ...extra,
    })

  it('aceita parcelada com divisão igual', () => {
    expect(installment({})).toEqual([])
  })

  it('não combina com recorrência', () => {
    expect(installment({ recurrenceRule: 'MONTHLY' })).toEqual([
      'installmentsWithRecurrence',
    ])
  })

  it('não combina com divisão por valor', () => {
    expect(
      installment({
        splitMode: 'BY_AMOUNT',
        paidFor: [{ participant: 'a', shares: '100' }],
      }),
    ).toEqual(['installmentsByAmount'])
  })

  it('cada parcela tem pelo menos um centavo', () => {
    expect(installment({ amount: '0,02' })).toEqual(['installmentTooSmall'])
  })

  it('de 2 a 24 parcelas', () => {
    expect(installment({ installmentCount: 1 })).not.toEqual([])
    expect(installment({ installmentCount: 25 })).not.toEqual([])
  })
})
