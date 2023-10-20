import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const predefinedExtensions = [
  {
    product_id: 'B96677A0',
    name: 'ai_trading',
    title: 'AI Trading',
    description: 'AI Trading Addon',
    link: 'https://codecanyon.net/item/bot-investment-addon-for-bicrypto-crypto-trader-investment-subscription/35988984',
    image: 'extensions/ai-trading',
  },
  {
    product_id: 'EB4AADC3',
    name: 'ecosystem',
    title: 'EcoSystem & Native Trading',
    description: 'EcoSystem & Native Trading',
    link: 'https://codecanyon.net/item/ecosystem-native-trading-addon-for-bicrypto/40071914',
    image: 'extensions/ecosystem',
  },
  {
    product_id: '61433370',
    name: 'ico',
    title: 'Token ICO',
    description: 'Token ICO',
    link: 'https://codecanyon.net/item/token-ico-addon-for-bicrypto-token-offers-metamask-bep20-erc20-smart-contracts/36120046',
  },
  {
    product_id: 'D29FD60F',
    name: 'mlm',
    title: 'Multi Level Marketing',
    description: 'Multi Level Marketing',
    link: 'https://codecanyon.net/item/multi-level-marketing-addon-for-bicrypto/36667808',
  },
  {
    product_id: 'F8C1C44E',
    name: 'forex',
    title: 'Forex & Investment',
    description: 'Forex & Investment',
    link: 'https://codecanyon.net/item/forex-investment-addon-for-bicrypto/36668679',
  },
  {
    product_id: '5868429E',
    name: 'staking',
    title: 'Staking Crypto',
    description: 'Staking Crypto',
    link: 'https://codecanyon.net/item/staking-crypto-addon-for-bicrypto-staking-investments-any-tokens-networks/37434481',
  },
  {
    product_id: 'F47D081C',
    name: 'wallet_connect',
    title: 'Wallet Connect',
    description: 'Wallet Connect',
    link: 'https://codecanyon.net/item/wallet-connect-addon-for-bicrypto-wallet-login-connect/37548018',
  },
  {
    product_id: '90AC59FB',
    name: 'knowlege_base',
    title: 'Knowledge Base & Faqs',
    description: 'Knowledge Base & Faqs',
    link: 'https://codecanyon.net/item/knowledge-base-faqs-addon-for-bicrypto/39166202',
  },
  {
    product_id: 'C4160F60',
    name: 'swap',
    title: 'Swap',
    description: 'Swap',
    link: null,
  },
  {
    product_id: 'DBFE65CA',
    name: 'p2p',
    title: 'Peer To Peer Exchange',
    description: 'Peer To Peer Exchange',
    link: 'https://codecanyon.net/item/p2p-trading-addon-for-bicrypto-p2p-livechat-offers-moderation/44593497',
  },
  {
    product_id: '6FCAE834',
    name: 'ecommerce',
    title: 'Ecommerce',
    description: 'Ecommerce',
    link: 'https://codecanyon.net/item/ecommerce-addon-for-bicrypto-digital-products-wishlist-licenses/44624493',
  },
  {
    product_id: '02B81D43',
    name: 'mailwizard',
    title: 'MailWizard',
    description: 'MailWizard',
    link: 'https://codecanyon.net/item/mailwiz-addon-for-bicrypto-ai-image-generator-ai-content-generator-dragdrop-email-editor/45613491',
  },
]

async function main() {
  const extensionUpsertPromises = predefinedExtensions.map((extension) =>
    prisma.extension.upsert({
      where: { product_id: extension.product_id },
      update: {
        name: extension.name,
        title: extension.title,
        description: extension.description,
        link: extension.link,
        image: extension.image,
        product_id: extension.product_id,
      },
      create: extension,
    }),
  )

  // Await both sets of upserts to complete
  await Promise.all([...extensionUpsertPromises])
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
