import { handleController } from '~~/utils'
import { getTransaction, getTransactions } from './queries' // You will need to create these query functions

export const controllers = {
  index: handleController(async (_, __, ___, query) => {
    const { user, type, status, wallet, walletType, basic } = query
    return await getTransactions(user, type, status, wallet, walletType, basic)
  }),

  show: handleController(async (_, __, params) => {
    return await getTransaction(params.referenceId)
  }),
}
