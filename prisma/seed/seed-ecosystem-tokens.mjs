import { PrismaClient } from '@prisma/client'
import tokens from './tokenlist.json' assert { type: 'json' }

const prisma = new PrismaClient()

async function main() {
  const tokenUpsertPromises = []

  Object.keys(tokens).forEach((chain) => {
    tokens[chain].forEach((token) => {
      tokenUpsertPromises.push(
        prisma.ecosystem_token.upsert({
          where: { contract: token.address },
          update: {
            name: token.name,
            currency: token.symbol,
            chain,
            network: token.network || 'mainnet',
            type: token.type,
            contract: token.address,
            decimals: token.decimals,
            icon: token.logoURI,
            contractType: token.contractType || 'NO_PERMIT',
          },
          create: {
            name: token.name,
            currency: token.symbol,
            chain,
            network: token.network || 'mainnet',
            type: token.type,
            contract: token.address,
            decimals: token.decimals,
            status: false,
            icon: token.logoURI,
            contractType: token.contractType || 'NO_PERMIT',
          },
        }),
      )
    })
  })

  await Promise.all(tokenUpsertPromises)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
