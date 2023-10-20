import { handleController } from '~~/utils'
import { redis } from '~~/utils/redis'
import {
  createPlan,
  deletePlan,
  getPlan,
  getPlans,
  updatePlan,
  updatePlanStatus,
} from './queries'

async function cachePlans() {
  const plans = await getPlans()
  await redis.set('plans', JSON.stringify(plans), 'EX', 3600)
}

cachePlans()

export const controllers = {
  index: handleController(async () => {
    try {
      const cachedPlans = await redis.get('plans')
      if (cachedPlans) return JSON.parse(cachedPlans)
    } catch (err) {
      console.error('Redis error:', err)
    }
    return await getPlans()
  }),
  show: handleController(async (_, __, params) => {
    try {
      const cachedPlans = await redis.get('plans')
      if (cachedPlans) {
        const plans = JSON.parse(cachedPlans)
        const plan = plans.find((p) => p.id === Number(params.id))
        if (plan) return plan
      }
    } catch (err) {
      console.error('Redis error:', err)
    }
    return await getPlan(Number(params.id))
  }),
  store: handleController(async (_, __, ___, ____, body) => {
    try {
      const response = await createPlan(body.plan)
      cachePlans()
      return {
        ...response,
        message: 'Investment plan created successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
  update: handleController(async (_, __, params, ___, body) => {
    try {
      const response = await updatePlan(Number(params.id), body.plan)
      cachePlans()
      return {
        ...response,
        message: 'Investment plan updated successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
  delete: handleController(async (_, __, params) => {
    try {
      await await deletePlan(Number(params.id))
      cachePlans()
      return {
        message: 'Investment plan removed successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
  updateStatus: handleController(async (_, __, ___, ____, body) => {
    try {
      await updatePlanStatus(body.ids, body.status)
      cachePlans()
      return {
        message: 'Investment plan updated successfully',
      }
    } catch (error) {
      throw new Error(error.message)
    }
  }),
}
