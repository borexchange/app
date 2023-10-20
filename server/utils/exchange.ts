import * as ccxt from 'ccxt'
import { createLogger } from '../logger'
import prisma from './prisma'
import { sleep } from './system'
const logger = createLogger('Exchange')

class ExchangeManager {
  static readonly instance = new ExchangeManager()
  private readonly exchangeCache = new Map<string, any>()
  private provider: string | null = null
  private exchange: any = null
  private exchangeProvider: any = null

  private async fetchActiveProvider(): Promise<string> {
    try {
      const provider = await prisma.exchange.findFirst({
        where: {
          status: true,
        },
      })
      if (!provider) {
        logger.error('No active provider found.')
        return null
      }
      return provider.name
    } catch (error) {
      logger.error('Error fetching active provider:', error)
      return null
    }
  }

  private async initializeExchange(
    provider: string,
    retries = 3,
  ): Promise<any> {
    if (!this.exchangeCache.has(provider)) {
      const apiKey = process.env[`APP_${provider.toUpperCase()}_API_KEY`]
      const apiSecret = process.env[`APP_${provider.toUpperCase()}_API_SECRET`]
      const apiPassphrase =
        process.env[`APP_${provider.toUpperCase()}_API_PASSPHRASE`]

      // Check if environment variables are set and not empty
      if (!apiKey || !apiSecret || apiKey === '' || apiSecret === '') {
        throw new Error(
          'Missing or empty API credentials in environment variables.',
        )
      }
      try {
        const exchange = new ccxt.pro[provider]({
          apiKey,
          secret: apiSecret,
          password: apiPassphrase,
        })

        // Check if the provided credentials are correct
        const credentialsValid = await exchange.checkRequiredCredentials()
        if (!credentialsValid) {
          throw new Error('Invalid API credentials.')
        }

        this.exchangeCache.set(provider, exchange)
        logger.info(
          `Exchange for provider ${provider} successfully initialized.`,
        )
      } catch (error) {
        logger.error(`Failed to initialize exchange: ${error}`)
        if (retries > 0) {
          logger.error(`Retrying (${retries} retries left)...`)
          await sleep(2000) // Wait for 2 seconds before retrying
          return this.initializeExchange(provider, retries - 1)
        }
        return null
      }
    }
    return this.exchangeCache.get(provider)
  }

  public async startExchange(): Promise<any> {
    try {
      if (!this.provider) {
        this.provider = await this.fetchActiveProvider()
      }
      if (!this.exchange && this.provider) {
        this.exchange = await this.initializeExchange(this.provider)
      }
      return this.exchange
    } catch (error) {
      logger.error(`Failed to start exchange: ${error}`)
      return null
    }
  }

  public async startExchangeProvider(provider: string): Promise<any> {
    if (!this.exchangeProvider && provider) {
      this.exchangeProvider = await this.initializeExchange(provider)
    }
    return this.exchangeProvider
  }

  public removeExchange(provider: string): void {
    this.exchangeCache.delete(provider)
    if (this.provider === provider) {
      this.exchange = null
      this.provider = null
    }
  }
}

export default ExchangeManager.instance
