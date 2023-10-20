// ./http/auth/controller.ts
import { handleController } from '../../utils'
import {
  getUserById,
  loginUser,
  logoutUser,
  registerUser,
  resendOtp,
  resetPasswordQuery,
  updateUserQuery,
  verifyLoginOTP,
  verifyPasswordResetQuery,
} from './queries' // Make sure these functions exist in your queries file

export const controllers = {
  register: handleController(async (_, __, ___, ____, body) => {
    return await registerUser(
      body.first_name,
      body.last_name,
      body.email,
      body.password,
    )
  }),
  login: handleController(async (_, __, ___, ____, body) => {
    return await loginUser(body.email, body.password)
  }),
  loginOtp: handleController(async (_, __, ___, ____, body) => {
    return await verifyLoginOTP(body.uuid, body.otp)
  }),
  resendOtp: handleController(async (_, __, ___, ____, body) => {
    return await resendOtp(body.uuid, body.secret)
  }),
  profile: handleController(async (_, __, ___, ____, _____, user) => {
    if (!user) throw new Error('User not found')
    return await getUserById(user.id)
  }),
  update: handleController(async (_, __, ___, ____, body, user) => {
    if (!user) throw new Error('User not found')
    return await updateUserQuery(user.id, body.user)
  }),
  resetPassword: handleController(async (_, __, ___, ____, body) => {
    return await resetPasswordQuery(body.email)
  }),
  verifyResetPassword: handleController(async (_, __, ___, ____, body) => {
    return await verifyPasswordResetQuery(body.token)
  }),
  logout: handleController(async (_, req, ___, ____, _____, user) => {
    if (!user) throw new Error('User not found')
    return await logoutUser(req, user.id)
  }),
}
