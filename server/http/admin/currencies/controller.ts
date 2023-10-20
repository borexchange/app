import { handleController } from '~~/utils'
import { updateCurrency } from './queries'

export const controllers = {
  updateStatus: handleController(async (_, __, body) => {
    try {
      const { ids, status } = body
      await updateCurrency(ids, status)
      return {
        message: 'Currencies updated successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
}
