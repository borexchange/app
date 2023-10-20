import type { User } from '~~/types'

import { createError } from '~~/utils'
import prisma from '~~/utils/prisma'

export async function getUsers(): Promise<User[]> {
  const users = (await prisma.user.findMany({
    include: {
      role: true,
    },
  })) as unknown as User[]
  for (const user of users) {
    delete user.password
    delete user.phone
  }
  return users
}

export async function getUser(uuid: string): Promise<User> {
  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing user uuid',
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { uuid },
      include: {
        role: true,
      },
    })

    if (user === null || !('email' in user)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }

    delete user.password
    delete user.phone

    return user as unknown as User
  } catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    })
  }
}

export async function updateUser(
  uuid: string,
  body: Partial<User>,
  userId: number,
): Promise<any> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { uuid },
    })
    if (user.id === userId) {
      delete body.role_id
      delete body.role
    }
    await prisma.user.update({
      where: { uuid },
      data: {
        ...(body as any),
        role_id: Number(body.role_id),
      },
    })

    return {
      message: 'User updated successfully',
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user',
    })
  }
}

export async function deleteUser(uuid: string): Promise<void> {
  await prisma.user.delete({ where: { uuid: uuid } })
}

export async function deleteUsers(userIds: number[]): Promise<void> {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing user ids',
    })
  }

  // Delete each user from the database
  try {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    })
  } catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    })
  }
}

export async function updateUsersStatus(
  userIds: number[],
  status: string,
): Promise<void> {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    console.log('Missing user ids')
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing user ids',
    })
  }
  // Check if status is provided
  if (!status) {
    console.log('Missing status')
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing status',
    })
  }

  // Update each user status
  try {
    await prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        status: status as any,
      },
    })
  } catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }
}
