import type { Transaction, Wallet } from '~~/types'
import {
  sendTransactionStatusUpdateEmail,
  sendWalletBalanceUpdateEmail,
} from '~~/utils/emails'
import { makeUuid } from '~~/utils/passwords'
import prisma from '~~/utils/prisma'

async function getUserID(userUuid: string) {
  const user = await prisma.user.findUnique({
    where: { uuid: userUuid },
  })
  if (!user) throw new Error('Invalid user UUID')
  return user.id
}

export async function getWallets(
  userUuid?: string,
  type?: string,
): Promise<Wallet[]> {
  // Determine the user ID if userUuid is provided
  const userId = userUuid ? await getUserID(userUuid) : undefined

  // Define the where clause based on the provided parameters
  const where: any = {
    user_id: userId,
  }
  if (type) {
    where.type = type
  }

  // Include user details in the query
  const include = {
    user: {
      select: {
        first_name: true,
        last_name: true,
        uuid: true,
        avatar: true,
      },
    },
  }

  // Query the wallets based on the where clause and include the user details
  const wallets = await prisma.wallet.findMany({
    where,
    include,
  })

  return wallets as unknown as Wallet[]
}

export async function getWallet(uuid: string): Promise<any | null> {
  return (await prisma.wallet.findUnique({
    where: { uuid: uuid },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
          uuid: true,
          avatar: true,
        },
      },
      transactions: {
        select: {
          id: true,
          uuid: true,
          amount: true,
          fee: true,
          type: true,
          status: true,
          created_at: true,
          metadata: true,
        },
      },
    },
  })) as unknown as Wallet
}

export async function updateWalletBalance(
  uuid: string,
  type: 'ADD' | 'SUBTRACT',
  amount: number,
): Promise<Wallet | null> {
  const wallet = await prisma.wallet.findUnique({
    where: { uuid },
  })

  if (!wallet) throw new Error('Wallet not found')

  const newBalance =
    type === 'ADD' ? wallet.balance + amount : wallet.balance - amount

  if (newBalance < 0) throw new Error('Insufficient funds in wallet')

  const updatedWallet = await prisma.wallet.update({
    where: { uuid },
    data: { balance: newBalance },
  })

  await prisma.transaction.create({
    data: {
      uuid: makeUuid(),
      user_id: wallet.user_id,
      wallet_id: wallet.id,
      amount: amount,
      type: type === 'ADD' ? 'INCOMING_TRANSFER' : 'OUTGOING_TRANSFER',
      status: 'COMPLETED',
      metadata: {
        method: 'ADMIN',
      },
      description: `Admin ${
        type === 'ADD' ? 'added' : 'subtracted'
      } ${amount} ${wallet.currency} to wallet`,
    },
  })

  // Fetch the user information to pass to the email function
  const user = await prisma.user.findUnique({
    where: { id: wallet.user_id },
  })

  if (user) {
    await sendWalletBalanceUpdateEmail(
      user,
      updatedWallet,
      type === 'ADD' ? 'added' : 'subtracted',
      amount,
      newBalance,
    )
  }

  const returnWallet = await prisma.wallet.findUnique({
    where: { uuid },
    include: {
      user: {
        select: {
          first_name: true,
          last_name: true,
          uuid: true,
          avatar: true,
        },
      },
      transactions: {
        select: {
          id: true,
          uuid: true,
          amount: true,
          fee: true,
          type: true,
          status: true,
          created_at: true,
          metadata: true,
        },
      },
    },
  })

  return returnWallet as unknown as Wallet
}

export async function updateTransactionStatusQuery(
  referenceId: string,
  status: string,
  message?: string,
): Promise<Transaction> {
  const transaction = await prisma.transaction.findUnique({
    where: { uuid: referenceId },
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const updateData: any = {
    status: status,
    metadata: transaction.metadata,
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: transaction.wallet_id },
  })

  if (!wallet) {
    throw new Error('Wallet not found')
  }

  let balance = Number(wallet.balance)

  if (status === 'REJECTED') {
    if (message) {
      updateData.metadata.note = message
    }
    if (transaction.type === 'WITHDRAW') {
      balance += Number(transaction.amount)
    }
  } else if (status === 'COMPLETED') {
    if (transaction.type === 'DEPOSIT') {
      balance += Number(transaction.amount) - Number(transaction.fee)
    }
  }

  if (wallet.balance !== balance) {
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: balance },
    })
  }

  const updatedTransaction = (await prisma.transaction.update({
    where: { uuid: referenceId },
    data: updateData,
  })) as unknown as Transaction

  // Fetch user information for email
  const user = await prisma.user.findUnique({
    where: { id: transaction.user_id },
  })

  if (user) {
    // Send an email notification about the transaction status update
    const emailResult = await sendTransactionStatusUpdateEmail(
      user,
      updatedTransaction,
      wallet,
      balance,
      updateData.metadata?.note || null,
    )
  }

  return updatedTransaction as unknown as Transaction
}
