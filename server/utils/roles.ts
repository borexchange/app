import prisma from './prisma'

let rolesAndPermissionsCache = {}

export const loadRolesAndPermissions = async () => {
  try {
    const rolesWithPermissions = await prisma.role.findMany({
      include: {
        rolepermission: {
          include: {
            permission: true,
          },
        },
      },
    })

    const cache = {}

    rolesWithPermissions.forEach((role) => {
      cache[role.id] = {
        name: role.name,
        permissions: role.rolepermission.map((rp) => rp.permission.name),
      }
    })

    rolesAndPermissionsCache = cache
  } catch (error) {
    console.error('Failed to load roles and permissions:', error)
  }
}

export const getRolesAndPermissionsCache = () => {
  return rolesAndPermissionsCache
}

// Load the roles and permissions into cache on startup.
loadRolesAndPermissions()
