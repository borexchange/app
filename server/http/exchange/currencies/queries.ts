import type { ExchangeCurrency } from '../../../types'

import prisma from '../../../utils/prisma'

export async function getCurrencies(): Promise<ExchangeCurrency[]> {
  return prisma.exchange_currency.findMany() as unknown as ExchangeCurrency[]
}

export async function getCurrency(
  id: number,
): Promise<ExchangeCurrency | null> {
  return prisma.exchange_currency.findUnique({
    where: {
      id: id,
    },
  }) as unknown as ExchangeCurrency
}

export async function updateCurrency(
  id: number,
  currencyData: ExchangeCurrency,
): Promise<ExchangeCurrency> {
  return (await prisma.exchange_currency.update({
    where: {
      id: id,
    },
    data: currencyData,
  })) as unknown as ExchangeCurrency
}

export async function updateCurrenciesStatus(
  ids: number[],
  status: boolean,
): Promise<boolean> {
  await prisma.exchange_currency.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      status: status,
    },
  })
  return true
}

export async function updateCurrencyPricesBulk(
  data: { id: number; price: number }[],
) {
  const updates = data.map(async (item) => {
    const existingRecord = await prisma.exchange_currency.findUnique({
      where: { id: item.id },
    })

    if (existingRecord) {
      return prisma.exchange_currency.update({
        where: { id: item.id },
        data: { price: item.price },
      })
    } else {
      console.warn(`Record with id ${item.id} not found.`)
      return null
    }
  })

  const results = await Promise.all(updates)
  return results.filter(Boolean) // Remove nulls
}
