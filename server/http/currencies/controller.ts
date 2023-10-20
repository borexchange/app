import { handleController } from '../../utils'
import { getCurrencies, getCurrency, updateCurrencyRates } from './queries'
import { redis } from '../../utils/redis'

// Function to cache the currencies
async function cacheCurrencies() {
  const currencies = await getCurrencies()
  await redis.set('currencies', JSON.stringify(currencies), 'EX', 300) // Cache for 5 minutes
}

// Initialize the cache when the file is loaded
cacheCurrencies()

export const controllers = {
  index: handleController(async () => {
    try {
      const cachedCurrencies = await redis.get('currencies')
      if (cachedCurrencies) return JSON.parse(cachedCurrencies)
    } catch (err) {
      console.error('Redis error:', err)
    }
    return await getCurrencies()
  }),

  show: handleController(async (_, params) => {
    try {
      const cachedCurrencies = await redis.get('currencies')
      if (cachedCurrencies) {
        const currencies = JSON.parse(cachedCurrencies)
        const currency = currencies.find((c) => c.id === params.id)
        if (currency) return currency
      }
    } catch (err) {
      console.error('Redis error:', err)
    }
    return await getCurrency(params.id)
  }),
}

export async function fetchFiatCurrencyPrices() {
  const baseCurrency = 'USD'
  const apiKey = process.env.APP_OPENEXCHANGERATES_APP_ID // Make sure to set this in your Nuxt config

  try {
    // Fetch latest exchange rates
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${baseCurrency}`,
    )
    const data = await response.json()

    if (data && data.rates) {
      const exchangeRates = data.rates

      // Prepare the rates to update
      const ratesToUpdate: Record<string, number> = {}

      for (const currency of JSON.parse(await redis.get('currencies'))) {
        if (exchangeRates.hasOwnProperty(currency.code)) {
          ratesToUpdate[currency.code] = exchangeRates[currency.code]
        }
      }

      // Update exchange rates in your model in a single batch
      await updateCurrencyRates(ratesToUpdate)
      cacheCurrencies() // Update the cache
    } else {
      console.log('Error fetching fiat currency prices:')
    }
  } catch (error) {
    return error
  }
}
