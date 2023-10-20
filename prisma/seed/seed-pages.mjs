import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const Pages = [
  {
    title: 'About',
    slug: 'about',
    description: 'This is the about page',
    content: 'This is the about page',
    status: 'PUBLISHED',
  },
  {
    title: 'Contact',
    slug: 'contact',
    description: 'This is the contact page',
    content: 'This is the contact page',
    status: 'PUBLISHED',
  },
  {
    title: 'Terms',
    slug: 'terms',
    description: 'This is the terms page',
    content: 'This is the terms page',
    status: 'PUBLISHED',
  },
  {
    title: 'Privacy',
    slug: 'privacy',
    description: 'This is the privacy page',
    content: 'This is the privacy page',
    status: 'PUBLISHED',
  },
]

async function main() {
  const pageUpsertPromises = Pages.map((page) => {
    return prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    })
  })

  await Promise.all(pageUpsertPromises)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
