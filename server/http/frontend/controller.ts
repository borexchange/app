import { handleController } from '~~/utils'
import { getFrontendSections } from './queries'
import { redis } from '~~/utils/redis'

export async function cacheFrontendSections() {
  const frontendSections = await getFrontendSections()
  await redis.set(
    'frontendSections',
    JSON.stringify(frontendSections),
    'EX',
    43200,
  ) // Cache for 12 hours
}

cacheFrontendSections()

export const controllers = {
  index: handleController(async () => {
    try {
      const cachedFrontendSections = await redis.get('frontendSections')
      if (cachedFrontendSections) return JSON.parse(cachedFrontendSections)
    } catch (err) {
      console.error('Redis error:', err)
    }
    return await getFrontendSections()
  }),
}
