import { PrismaClient } from '@prisma/client'
import permissions from './permissions.json' assert { type: 'json' }

const prisma = new PrismaClient()

const permissionsList = [
  'Access Admin Dashboard',
  'Access Users Management',
  'Access Frontend Management',
  'Access Frontend Editor',
  'Access KYC Management',
  'Access KYC Applications Management',
  'Access KYC Application Details',
  'Access KYC Templates Management',
  'Create KYC Template',
  'Edit KYC Template',
  'Access Permissions Management',
  'Access Roles Management',
  'Edit Role Permissions',
  'Access Financial Management',
  'Access Wallet Management',
  'Access Wallet Details',
  'Access Transaction Logs',
  'Access Transaction Details',
  'Access Exchange Logs',
  'Access Deposit Methods',
  'Create Deposit Methods',
  'Edit Deposit Methods',
  'Access Deposit Gateways',
  'Edit Deposit Gateways',
  'Access Withdraw Methods',
  'Create Withdraw Methods',
  'Edit Withdraw Methods',
  'Access Investment Plans',
  'Create Investment Plans',
  'Edit Investment Plans',
  'Access Investment Logs',
  'Access Blog Management',
  'Access Blog Authors',
  'Access Blog Categories',
  'Access Blog Posts',
  'Create Blog Posts',
  'Edit Blog Posts',
  'Delete Blog Posts',
  'Access Blog Tags',
  'Access System Management',
  'Access Settings',
  'Access General Settings',
  'Access Extensions',
  'Access System Update',
  'Access Menu Management',
  'Access Exchange Wizard',
  'Access Exchange Currencies',
  'Access Exchange Markets',
  'Access KYC Settings',
  'Access Locales Management',
  'Edit Menu',
  'Edit Notification Template',
  'Access Notification Email Test',
  'Access Notification Templates Management',
  'Access Page Editor',
  'Access Binary Trading Settings',
  'Access Exchange Provider Settings',
  'Access Fiat Currencies Management',
  'Access Logo Settings',
  'Access Notification Settings',
  'Access Pages Management',
  'Access Support Ticket Details',
  'Access Support Tickets',
  'Access Extension Details',
  ...permissions,
].map((permission) => ({ name: permission }))

async function main() {
  // Fetch existing permissions from the database
  const existingPermissions = await prisma.permission.findMany({
    select: { id: true, name: true },
  })

  // Create a Set of existing permission names
  const existingPermissionNames = new Set(
    existingPermissions.map((perm) => perm.name),
  )
  const duplicatePermissionIds = []

  for (const { id, name } of existingPermissions) {
    if (existingPermissionNames.has(name)) {
      duplicatePermissionIds.push(id)
    } else {
      existingPermissionNames.add(name)
    }
  }

  // Filter out the permissions that already exist in the database
  const newPermissions = permissionsList
    .filter((perm) => !existingPermissionNames.has(perm.name))
    .map((permission) => ({ name: permission.name }))

  if (newPermissions.length > 0) {
    await prisma.permission.createMany({
      data: newPermissions,
      skipDuplicates: true,
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
