import { getWalletQuery } from '~~/http/wallets/spot/queries'
import { type ExchangeOrder } from '~~/types'
import { handleController } from '~~/utils'
import ExchangeManager from '~~/utils/exchange'
import prisma from '~~/utils/prisma'
import { createOrder, getOrder, getOrders, updateWalletQuery } from './queries'

export const controllers = {
  index: handleController(async (_, __, ___, query, ____, user) => {
    if (!user) {
      throw new Error('User not found')
    }
    return getOrders(user.id)
  }),
  show: handleController(async (_, __, params, ___, ____, user) => {
    if (!user) {
      throw new Error('User not found')
    }
    try {
      return await getOrder(params.uuid)
    } catch (error) {
      throw new Error('Order not found')
    }
  }),
  store: handleController(async (_, __, ____, ___, body, user) => {
    if (!user) {
      throw new Error('User not found')
    }

    try {
      const {
        amount: amountString,
        price: priceString,
        side: sideString,
        symbol,
        fee,
        fee_currency,
        type: typeString,
        cost,
      } = body.order

      if (!symbol) {
        throw new Error('Symbol is undefined')
      }

      const [currency, pair] = symbol.split('/')

      const amount = Number(amountString)
      const price = Number(priceString)
      const side = sideString.toLowerCase()
      const type = typeString.toLowerCase()

      const currencyWallet = await getWalletQuery(user.id, currency)
      if (!currencyWallet) {
        throw new Error('Currency wallet not found')
      }

      const pairWallet = await getWalletQuery(user.id, pair)
      if (!pairWallet) {
        throw new Error('Pair wallet not found')
      }

      if (side === 'buy' && pairWallet.balance < cost) {
        throw new Error(`Insufficient balance. You need ${cost} ${pair}`)
      } else if (side !== 'buy' && currencyWallet.balance < amount) {
        throw new Error(`Insufficient balance. You need ${amount} ${currency}`)
      }

      const exchange = await (ExchangeManager as any).startExchange()

      if (!exchange) {
        throw new Error('Exchange offline')
      }

      let order
      try {
        order = await exchange.createOrder(
          symbol,
          type,
          side,
          amount,
          type === 'limit' ? price : undefined,
        )
      } catch (error) {
        console.log(error)
        throw new Error(`Cost is too low. You need ${cost} ${pair}`)
      }
      if (!order || !order.id) {
        throw new Error('Failed to create order')
      }

      const orderData = await exchange.fetchOrder(order.id, symbol)
      if (!orderData) {
        throw new Error('Failed to fetch order')
      }

      if (side === 'buy') {
        const balance = pairWallet.balance - cost
        await updateWalletQuery(pairWallet.id, {
          balance,
        })

        if (orderData.status === 'closed') {
          const balance =
            currencyWallet.balance +
            (Number(orderData.amount) - (Number(orderData.fee?.cost) || fee))
          await updateWalletQuery(currencyWallet.id, {
            balance,
          })
        }
      } else {
        const balance = currencyWallet.balance - amount
        await updateWalletQuery(currencyWallet.id, {
          balance,
        })

        if (orderData.status === 'closed') {
          const balance =
            pairWallet.balance +
            (Number(orderData.cost) - (Number(orderData.fee?.cost) || fee))
          await updateWalletQuery(pairWallet.id, {
            balance,
          })
        }
      }

      const response = (await createOrder(user.id, {
        ...orderData,
        reference_id: order.id,
        fee_currency: fee_currency,
        fee: orderData.fee?.cost || fee,
      })) as unknown as ExchangeOrder

      if (!response) {
        throw new Error('Failed to create order')
      }

      return {
        order: response,
        message: 'Order created successfully',
      }
    } catch (error) {
      console.log(error)
      throw new Error(error.message)
    }
  }),

  // Your cancel handler
  cancel: handleController(async (_, __, params, ___, ____, user) => {
    if (!user) {
      throw new Error('User not found')
    }

    const order = await getOrder(params.uuid)
    if (!order) {
      throw new Error('Order not found')
    }

    if (order.status === 'CANCELED') {
      throw new Error('Order already cancelled')
    }

    if (order.user_id !== user.id) {
      throw new Error('Order not found')
    }

    const exchange = await (ExchangeManager as any).startExchange()
    if (!exchange) {
      throw new Error('Exchange offline')
    }

    let orderData
    try {
      if (exchange.has['fetchOrder']) {
        orderData = await exchange.fetchOrder(order.reference_id, order.symbol)
      } else {
        const orders = await exchange.fetchOrders(order.symbol)
        orderData = orders.find((o: any) => o.id === order.reference_id)
      }

      if (!orderData || !orderData.id) {
        throw new Error('Failed to fetch order')
      }

      const filteredUpdateData = await updateOrderData(order.uuid, orderData)

      if (orderData.status !== 'open') {
        throw new Error('Order is not open')
      }

      if (orderData.filled !== 0) {
        throw new Error('Order is partially filled')
      }

      await exchange.cancelOrder(order.reference_id, order.symbol)

      const walletCurrency =
        orderData.side === 'buy'
          ? order.symbol.split('/')[1]
          : order.symbol.split('/')[0]
      const wallet = await getWalletQuery(user.id, walletCurrency)

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      const cost = order.price * order.amount

      const balanceUpdate =
        orderData.side === 'buy'
          ? wallet.balance + cost
          : wallet.balance + order.amount

      // Start a Prisma transaction
      const transaction = await prisma.$transaction([
        prisma.exchange_orders.update({
          where: { uuid: order.uuid },
          data: filteredUpdateData,
        }),
        prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceUpdate },
        }),
      ])

      if (!transaction) {
        throw new Error('Transaction failed')
      }

      const newOrder = await updateOrderData(order.uuid, {
        ...orderData,
        status: 'CANCELED',
      })

      return {
        ...newOrder,
        message: 'Order cancelled successfully',
      }
    } catch (error) {
      console.error('Error:', error)
      throw new Error(error.message)
    }
  }),

  // Your check handler
  check: handleController(async (_, __, params, ___, ____, user) => {
    if (!user) {
      throw new Error('User not found')
    }

    const order = await getOrder(params.uuid)
    if (!order) {
      throw new Error('Order not found')
    }

    if (order.user_id !== user.id) {
      throw new Error('Order not found')
    }

    const exchange = await (ExchangeManager as any).startExchange()
    if (!exchange) {
      throw new Error('Exchange offline')
    }

    let orderData
    try {
      if (exchange.has['fetchOrder']) {
        orderData = await exchange.fetchOrder(order.reference_id, order.symbol)
      } else {
        const orders = await exchange.fetchOrders(order.symbol)
        orderData = orders.find((o: any) => o.id === order.reference_id)
      }

      if (!orderData || !orderData.id) {
        throw new Error('Failed to fetch order')
      }

      const updatedOrder = await updateOrderData(order.uuid, orderData)
      if (updatedOrder.status === 'CLOSED') {
        await updateWalletBalance(user.id, updatedOrder)
      }

      return updatedOrder
    } catch (error) {
      console.error('Error:', error)
      throw new Error(error.message)
    }
  }),
}

async function updateOrderData(uuid: string, orderData: any) {
  const updateData: Record<string, any> = {
    status: orderData.status.toUpperCase(),
    filled: orderData.filled,
    remaining: orderData.remaining,
    cost: orderData.cost,
    fee: orderData.fee?.cost,
    trades: orderData.trades,
    average: orderData.average,
  }

  // Remove undefined properties
  const filteredUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([_, value]) => value !== undefined),
  )

  return await prisma.exchange_orders.update({
    where: {
      uuid: uuid,
    },
    data: filteredUpdateData,
  })
}

// New function to update wallet balance
async function updateWalletBalance(userId: number, order: any) {
  const [currency, pair] = order.symbol.split('/')
  const amount = Number(order.amount)
  const cost = Number(order.cost)
  const fee = Number(order.fee || 0)

  const currencyWallet = await getWalletQuery(userId, currency)
  const pairWallet = await getWalletQuery(userId, pair)

  if (order.side === 'BUY') {
    const newBalance = currencyWallet.balance + (amount - fee)
    await updateWalletQuery(currencyWallet.id, { balance: newBalance })
  } else {
    // sell
    const newBalance = pairWallet.balance + (cost - fee)
    await updateWalletQuery(pairWallet.id, { balance: newBalance })
  }
}
