import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const Exchanges = [
  {
    name: 'kucoin',
    title: 'KuCoin',
    productId: '6D0DD3C8',
    version: '1.0.0',
    type: 'spot',
  },
  {
    name: 'binance',
    title: 'Binance',
    productId: 'EBAC01EE',
    version: '1.0.0',
    type: 'spot',
  },
]

async function main() {
  const exchangeUpsertPromises = Exchanges.map((exchange) => {
    return prisma.exchange.upsert({
      where: { productId: exchange.productId },
      update: {
        title: exchange.title,
        productId: exchange.productId,
        type: exchange.type,
      },
      create: exchange,
    })
  })

  await Promise.all(exchangeUpsertPromises)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
