import prisma from '~~/utils/prisma'

export async function updateCurrency(
  ids: number[],
  status: boolean,
): Promise<void> {
  await prisma.currency.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      status: status,
    },
  })
}
