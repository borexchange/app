// Prisma seeder script
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// The frontEndSections array as defined above
const frontEndSections = [
  {
    section: 'animated_bg',
    title: 'Animated Background',
    status: true,
  },
  {
    section: 'banner',
    title: 'Banner Section',
    content: {
      heading: 'Trading crypto never been easier',
      subtext: {
        part1: 'is the best place to buy and sell cryptocurrency.',
        part2: 'Sign up and get started today.',
      },
      button: 'Start trading',
      image: '/img/banner/devices2.png',
    },
    status: true,
  },
  {
    section: 'features',
    title: 'Features Section',
    content: {
      heading: 'Trade with confidence',
      subtext: {
        part1: 'Discover why',
        part2:
          'stands as the definitive choice for cryptocurrency trading and investment',
      },
      features: [
        {
          title: 'Secure Transactions',
          description:
            'Benefit from state-of-the-art encryption and multi-level security protocols.',
        },
        {
          title: 'Comprehensive Analytics',
          description:
            'Make data-driven decisions with our real-time market analysis and interactive charts.',
        },
        {
          title: 'Unmatched Liquidity',
          description:
            'Trade effortlessly on a platform designed for both novice and experienced traders, with access to the most liquid markets.',
        },
      ],
      image: '/img/background/trading.svg',
    },
    status: true,
  },
  {
    section: 'markets',
    title: 'Markets Section',
    content: {
      heading: 'Markets',
      subtext:
        'Trade the world’s top crypto assets with low fees and many options',
    },
    status: true,
  },
  {
    section: 'steps',
    title: 'Steps Section',
    content: {
      heading: 'Easy to use, powerful and extremely safe',
      steps: [
        {
          step: 'Step 1',
          title: 'Create an account',
          description:
            'Create an account on [site_name] and verify your email address.',
          icon: 'solar:user-id-bold-duotone',
          iconColor: 'text-primary-500',
        },
        {
          step: 'Step 2',
          title: 'Deposit funds',
          description:
            'Deposit funds to your account using your preferred payment method.',
          icon: 'solar:card-recive-bold-duotone',
          iconColor: 'text-success-500',
        },
        {
          step: 'Step 3',
          title: 'Start trading',
          description:
            'Start trading on the world’s leading crypto exchange right now.',
          icon: 'bi:currency-exchange',
          iconColor: 'text-info-500',
        },
      ],
    },
    status: true,
  },
  {
    section: 'footer',
    title: 'Footer',
    status: true,
  },
]

async function main() {
  for (const section of frontEndSections) {
    // Check if section already exists
    const existingSection = await prisma.frontend.findUnique({
      where: {
        section: section.section,
      },
    })

    // If section does not exist, create it
    if (!existingSection) {
      await prisma.frontend.create({
        data: section,
      })
    }
  }
}

main()
  .catch((e) => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
