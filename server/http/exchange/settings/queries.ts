import { processCurrenciesPrices } from '~~/http/exchange/currencies/controller'

import prisma from '~~/utils/prisma'

export async function saveExchangeMarkets(symbols: any, currencies: any) {
  // Step 1: Save unique currencies with valid precision, deposit and withdraw statuses
  const validCurrencies: string[] = []

  // Get all existing currencies from the database for deletion logic later
  const existingCurrencies = await prisma.exchange_currency.findMany({
    select: { currency: true },
  })

  for (const currencyCode in currencies) {
    const currencyData = currencies[currencyCode]

    if (currencyData.precision) {
      // Filter the chains to include only those with both depositStatus and withdrawStatus set to true
      const validChains = currencyData.chains.filter(
        (chain) =>
          chain.depositStatus === true && chain.withdrawStatus === true,
      )

      // If there are any valid chains, proceed with the database upsert operation
      if (validChains.length > 0) {
        await prisma.exchange_currency.upsert({
          where: { currency: currencyCode },
          create: {
            currency: currencyCode,
            name: currencyData.name,
            precision: currencyData.precision,
            status: currencyData.status,
            chains: validChains, // Save only valid chains
          },
          update: {
            name: currencyData.name,
            precision: currencyData.precision,
            status: currencyData.status,
            chains: validChains, // Update only valid chains
          },
        })

        validCurrencies.push(currencyCode)
      }
    }
  }

  // Delete currencies that are not found in the validCurrencies list
  for (const existingCurrency of existingCurrencies) {
    if (!validCurrencies.includes(existingCurrency.currency)) {
      await prisma.exchange_currency.delete({
        where: { currency: existingCurrency.currency },
      })
    }
  }

  // Step 2: Save markets only if the currency exists in the validCurrencies list

  // Get all existing markets from the database for deletion logic later
  const existingMarkets = await prisma.exchange_market.findMany({
    select: { symbol: true },
  })

  for (const symbolKey in symbols) {
    const [currency, pair] = symbolKey.split('/')

    if (validCurrencies.includes(currency)) {
      const symbolData = symbols[symbolKey]
      await prisma.exchange_market.upsert({
        where: { symbol: symbolKey },
        create: {
          symbol: symbolKey,
          pair: pair,
          metadata: symbolData,
          status: true,
        },
        update: {
          metadata: symbolData,
        },
      })
    }
  }

  // Delete markets that are not found in the validCurrencies list
  for (const existingMarket of existingMarkets) {
    const [existingCurrency] = existingMarket.symbol.split('/')
    if (!validCurrencies.includes(existingCurrency)) {
      await prisma.exchange_market.delete({
        where: { symbol: existingMarket.symbol },
      })
    }
  }

  // Process currency prices (assuming you already have this function)
  await processCurrenciesPrices()

  return {
    message: 'Exchange markets and currencies saved successfully!',
  }
}

export async function getExchangeDetails() {
  // Fetch the exchange details
  const exchange = await prisma.exchange.findFirst({
    where: { status: true },
  })

  if (!exchange) {
    throw new Error('No exchange found')
  }
  // Fetch the exchange markets
  const markets = await prisma.exchange_market.findMany()

  if (markets.length === 0) {
    return {
      exchange: exchange,
    }
  }

  // Prepare the response
  const response = {
    exchange: exchange,
    symbols: markets.reduce((acc, market) => {
      acc[market.symbol] = market.metadata
      return acc
    }, {}),
  }

  return response
}

export async function saveLicense(productId: string, username: string) {
  const existingExchange = await prisma.exchange.findFirst({
    where: { status: true },
  })
  if (existingExchange && existingExchange.productId !== productId) {
    await prisma.exchange.update({
      where: { productId: existingExchange.productId },
      data: {
        status: false,
      },
    })
    await prisma.exchange_currency.deleteMany()
    await prisma.exchange_market.deleteMany()
    await prisma.exchange_orders.deleteMany()
    await prisma.exchange_watchlist.deleteMany()
  }
  try {
    await prisma.exchange.update({
      where: { productId: productId },
      data: {
        licenseStatus: true,
        status: true,
        username: username,
      },
    })
  } catch (error) {
    throw new Error(`Failed to save license: ${error}`)
  }
}
