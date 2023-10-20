import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rolesList = ['Super Admin', 'Admin', 'Support', 'User'].map((role) => ({
  name: role,
}))

async function main() {
  await prisma.role.createMany({
    data: rolesList,
    skipDuplicates: true, // Skips records with duplicate names
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
