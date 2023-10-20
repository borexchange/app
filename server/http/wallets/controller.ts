import { handleController } from '~~/utils'
import {
  createWallet,
  getTransactions,
  getUserWallets,
  getWallet,
  getWallets,
  transferFunds,
} from './queries'

export const controllers = {
  index: handleController(async () => {
    return await getWallets()
  }),

  show: handleController(async (_, __, ___, query, ____, user) => {
    return await getWallet(query.uuid)
  }),

  user: handleController(async (_, __, ___, ____, _____, user) => {
    return await getUserWallets(user.id)
  }),

  store: handleController(async (_, __, ___, ____, body, user) => {
    const wallet = await createWallet(user.id, body.currency, body.type)
    return {
      message: 'Wallet created successfully',
      wallet,
    }
  }),

  balance: handleController(async (_, __, ___, query) => {
    return await getWallet(query.uuid)
  }),

  transactions: handleController(async (_, __, ___, query) => {
    return await getTransactions(query.uuid)
  }),

  transfer: handleController(async (_, __, ___, ____, body, user) => {
    if (!user) throw new Error('User not found')
    const { currency, type, amount, to } = body
    return await transferFunds(user.id, currency, type, amount, to)
  }),
}
