import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import { v4 as uuidv4 } from 'uuid'

async function hashPassword(password) {
  try {
    return await argon2.hash(password)
  } catch (err) {
    console.error(`Error hashing password: ${err.message}`)
    throw new Error('Failed to hash password')
  }
}

function makeUuid() {
  return uuidv4()
}

const prisma = new PrismaClient()

async function main() {
  // Check if a Super Admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: {
        name: 'Super Admin',
      },
    },
  })

  if (existingSuperAdmin) {
    console.log(
      'A Super Admin already exists. No new Super Admin will be created.',
    )
    return
  }

  // Retrieve the ID of the Super Admin role
  const superAdminRole = await prisma.role.findFirst({
    where: {
      name: 'Super Admin',
    },
    select: {
      id: true,
    },
  })

  if (!superAdminRole) {
    console.error('Super Admin role not found. Exiting.')
    return
  }

  const superAdminRoleId = superAdminRole.id

  // Create a user with the Super Admin role
  await prisma.user.create({
    data: {
      uuid: makeUuid(),
      email: 'superadmin@example.com',
      password: await hashPassword('12345678'),
      first_name: 'Super',
      last_name: 'Admin',
      email_verified: true,
      is_active: true,
      role_id: superAdminRoleId,
    },
  })

  console.log('Super Admin has been successfully created.')
}

main()
  .catch((e) => {
    console.error(`Error: ${e}`)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
