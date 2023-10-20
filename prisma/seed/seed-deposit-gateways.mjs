import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DepositGateways = [
  {
    name: 'Stripe',
    title: 'Stripe',
    description: 'Payment gateway for credit cards',
    alias: 'stripe',
    type: 'FIAT',
    image: '/img/gateways/stripe.png',
    currencies: {
      USD: 'USD',
      AUD: 'AUD',
      BRL: 'BRL',
      CAD: 'CAD',
      CHF: 'CHF',
      DKK: 'DKK',
      EUR: 'EUR',
      GBP: 'GBP',
      HKD: 'HKD',
      INR: 'INR',
      JPY: 'JPY',
      MXN: 'MXN',
      MYR: 'MYR',
      NOK: 'NOK',
      NZD: 'NZD',
      PLN: 'PLN',
      SEK: 'SEK',
      SGD: 'SGD',
    },
    status: true,
    version: '0.0.1',
  },
  {
    name: 'PayPal',
    title: 'PayPal',
    description: 'Payment gateway for PayPal',
    alias: 'paypal',
    type: 'FIAT',
    image: '/img/gateways/paypal.png',
    currencies: {
      AUD: 'AUD',
      BRL: 'BRL',
      CAD: 'CAD',
      CZK: 'CZK',
      DKK: 'DKK',
      EUR: 'EUR',
      HKD: 'HKD',
      HUF: 'HUF',
      INR: 'INR',
      ILS: 'ILS',
      JPY: 'JPY',
      MYR: 'MYR',
      MXN: 'MXN',
      TWD: 'TWD',
      NZD: 'NZD',
      NOK: 'NOK',
      PHP: 'PHP',
      PLN: 'PLN',
      GBP: 'GBP',
      RUB: 'RUB',
      SGD: 'SGD',
      SEK: 'SEK',
      CHF: 'CHF',
      THB: 'THB',
      USD: '$',
    },
    status: false,
    version: '0.0.1',
  },
]

async function main() {
  const depositGatewayUpsertPromises = DepositGateways.map((gateway) => {
    return prisma.deposit_gateway.upsert({
      where: { name: gateway.name },
      update: gateway,
      create: gateway,
    })
  })

  await Promise.all(depositGatewayUpsertPromises)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
