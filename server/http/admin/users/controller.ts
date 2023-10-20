import { handleController } from '~~/utils'
import {
  deleteUser,
  deleteUsers,
  getUser,
  getUsers,
  updateUser,
  updateUsersStatus,
} from './queries'

export const controllers = {
  index: handleController(async () => {
    return getUsers()
  }),
  show: handleController(async (_, __, params) => {
    return getUser(params.uuid)
  }),
  update: handleController(async (_, __, params, ___, body, user) => {
    try {
      const response = await updateUser(params.uuid, body.user, user.id)
      return {
        ...response,
        message: 'User updated successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
  delete: handleController(async (_, __, params) => {
    try {
      await deleteUser(params.uuid)
      return {
        message: 'User removed successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
  deleteBulk: handleController(async (_, __, ___, ____, body) => {
    try {
      await deleteUsers(body.users)
      return {
        message: 'Users removed successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
  updateStatus: handleController(async (_, __, ___, ____, body) => {
    try {
      await updateUsersStatus(body.users, body.status)
      return {
        message: 'Users updated successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
}
