// ./http/auth/queries.ts
import { addMinutes } from 'date-fns'
import passwordGenerator from 'generate-password'
import { authenticator } from 'otplib'
import { createError } from '../../utils'
import { sendEmail } from '../../utils/emails'
import {
  hashPassword,
  makeUuid,
  validatePassword,
  verifyPassword,
} from '../../utils/passwords'
import prisma from '../../utils/prisma'
import {
  createSession,
  deleteAllRefreshTokens,
  deleteAllSessions,
  generateAccessToken,
  generateCsrfToken,
  generateRefreshToken,
  generateResetToken,
  storeRefreshToken,
  verifyResetToken,
} from '../../utils/token'

const APP_TWILIO_ACCOUNT_SID = process.env.APP_TWILIO_ACCOUNT_SID
const APP_TWILIO_AUTH_TOKEN = process.env.APP_TWILIO_AUTH_TOKEN
const APP_TWILIO_PHONE_NUMBER = process.env.APP_TWILIO_PHONE_NUMBER

const userInclude = {
  role: {
    include: {
      rolepermission: {
        include: {
          permission: true,
        },
      },
    },
  },
  twofactor: {
    select: {
      type: true,
      enabled: true,
    },
  },
  kyc: {
    select: {
      status: true,
      level: true,
    },
  },
  author: {
    select: {
      uuid: true,
      status: true,
    },
  },
}

// Register user and return token
export const registerUser = async (
  first_name: string,
  last_name: string,
  email: string,
  password: string,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error('Email already in use')
  }

  if (!validatePassword(password)) {
    throw new Error('Invalid password format')
  }

  const hashedPassword = await hashPassword(password)

  const role = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: { name: 'User' },
  })

  const newUser = await prisma.user.create({
    data: {
      first_name,
      last_name,
      uuid: makeUuid(),
      email,
      password: hashedPassword,
      role: {
        connect: {
          id: role.id,
        },
      },
    },
  })

  const publicUser = {
    id: newUser.id,
    role: newUser.role_id,
  }

  const accessToken = generateAccessToken(publicUser)
  const refreshToken = generateRefreshToken(publicUser)
  const csrfToken = generateCsrfToken()

  const session = await createSession(newUser.id, accessToken, csrfToken)
  await storeRefreshToken(newUser.id, refreshToken)

  return {
    message: 'User created successfully',
    cookies: {
      'access-token': accessToken,
      'refresh-token': refreshToken,
      'session-id': session.sid,
      'csrf-token': csrfToken,
    },
  }
}

// Login user and return token
export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      twofactor: true,
    },
  })
  if (!user) {
    throw new Error('User not found')
  }

  const isPasswordValid = await verifyPassword(user.password, password)
  if (!isPasswordValid) {
    await prisma.user.update({
      where: { email },
      data: {
        failed_login_attempts: user.failed_login_attempts + 1,
        last_failed_login: new Date(),
      },
    })
    throw new Error('Invalid password')
  }

  const blockedUntil = addMinutes(user.last_failed_login, 5)
  if (user.failed_login_attempts >= 5 && blockedUntil > new Date()) {
    throw new Error(
      'Too many failed login attempts, account is temporarily blocked for 5 minutes',
    )
  }

  await prisma.user.update({
    where: { email },
    data: {
      failed_login_attempts: 0,
      last_failed_login: null,
    },
  })

  if (user.twofactor?.enabled) {
    const type = user.twofactor?.type
    const otp = authenticator.generate(user.twofactor.secret)
    try {
      if (type === 'SMS') {
        const phoneNumber = user.phone

        try {
          const twilio = require('twilio')
          const twilioClient = twilio(
            APP_TWILIO_ACCOUNT_SID,
            APP_TWILIO_AUTH_TOKEN,
          )
          await twilioClient.messages.create({
            body: `Your OTP is: ${otp}`,
            from: APP_TWILIO_PHONE_NUMBER,
            to: phoneNumber,
          })
        } catch (error) {
          throw createError({
            statusCode: 500,
            statusMessage: error.message,
          })
        }
      }
      return {
        twofactor: {
          enabled: true,
          type: user.twofactor.type,
          secret: user.twofactor.secret,
        },
        uuid: user.uuid,
        message: '2FA required',
      }
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      })
    }
  }

  const publicUser = {
    id: user.id,
    role: user.role_id,
  }

  const accessToken = generateAccessToken(publicUser)
  const refreshToken = generateRefreshToken(publicUser)
  const csrfToken = generateCsrfToken()

  const session = await createSession(user.id, accessToken, csrfToken)
  await storeRefreshToken(user.id, refreshToken)

  return {
    message: 'You have been logged in successfully',
    cookies: {
      'access-token': accessToken,
      'refresh-token': refreshToken,
      'session-id': session.sid,
      'csrf-token': csrfToken,
    },
  }
}

export const verifyLoginOTP = async (uuid: string, otp: string) => {
  const user = await prisma.user.findUnique({
    where: { uuid },
    include: {
      twofactor: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const isValid = await authenticator.verify({
    token: otp,
    secret: user.twofactor.secret,
  })

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid OTP',
    })
  }

  const publicUser = {
    id: user.id,
    role: user.role_id,
  }

  const accessToken = generateAccessToken(publicUser)
  const refreshToken = generateRefreshToken(publicUser)
  const csrfToken = generateCsrfToken()

  const session = await createSession(user.id, accessToken, csrfToken)
  await storeRefreshToken(user.id, refreshToken)

  return {
    message: 'You have been logged in successfully',
    cookies: {
      'access-token': accessToken,
      'refresh-token': refreshToken,
      'session-id': session.sid,
      'csrf-token': csrfToken,
    },
  }
}

export const resendOtp = async (uuid: string, secret: string) => {
  if (!uuid || !secret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
    })
  }
  const user = await prisma.user.findUnique({
    where: { uuid },
    include: {
      twofactor: true,
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  if (user.twofactor?.secret !== secret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid Request',
    })
  }

  const type = user.twofactor?.type
  const otp = authenticator.generate(user.twofactor.secret)
  try {
    if (type === 'SMS') {
      const phoneNumber = user.phone

      try {
        const twilio = require('twilio')
        const twilioClient = twilio(
          APP_TWILIO_ACCOUNT_SID,
          APP_TWILIO_AUTH_TOKEN,
        )
        await twilioClient.messages.create({
          body: `Your OTP is: ${otp}`,
          from: APP_TWILIO_PHONE_NUMBER,
          to: phoneNumber,
        })
      } catch (error) {
        throw createError({
          statusCode: 500,
          statusMessage: error.message,
        })
      }
    }
    return {
      message: 'OTP sent successfully',
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }
}

export const logoutUser = async (req, userId: number) => {
  await deleteAllRefreshTokens(userId)
  await deleteAllSessions(userId)
  req.user = null
  return {
    message: 'You have been logged out',
    cookies: {
      'access-token': '',
      'refresh-token': '',
      'session-id': '',
      'csrf-token': '',
    },
  }
}

type AllowedUserUpdates = {
  first_name?: string
  last_name?: string
  metadata?: any
  password?: string
  current_password?: string
  avatar?: string | null
  email?: string
}

export const updateUserQuery = async (id: number, data: AllowedUserUpdates) => {
  const updateData: Partial<AllowedUserUpdates> = {}
  const extraData: { email_verified?: boolean } = {} // Additional fields managed internally

  // Handle allowed fields
  if (data.first_name) {
    updateData.first_name = data.first_name
  }
  if (data.last_name) {
    updateData.last_name = data.last_name
  }
  if (data.metadata) {
    updateData.metadata = data.metadata
  }
  if (data.avatar !== undefined) {
    updateData.avatar = data.avatar
  }
  if (data.email) {
    updateData.email = data.email
    extraData.email_verified = false // Set email_verified to false when email is updated
  }

  // Handle password update
  if (data.password && data.current_password) {
    if (!validatePassword(data.password)) {
      throw new Error('Invalid password format')
    }
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new Error('User not found')
    }
    const isPasswordValid = await verifyPassword(
      user.password,
      data.current_password,
    )
    if (!isPasswordValid) {
      throw new Error('Invalid password')
    }
    updateData.password = await hashPassword(data.password)
  } else if (data.password && !data.current_password) {
    throw new Error('Current password is required')
  }

  // Merge updateData and extraData for the final update
  await prisma.user.update({
    where: { id },
    data: { ...updateData, ...extraData },
  })
}

// Reset password
export const resetPasswordQuery = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new Error('User not found')
  }

  const resetToken = generateResetToken({
    user: {
      uuid: user.uuid,
    },
  })

  try {
    await sendEmail(
      {
        TO: user.email,
        FIRSTNAME: user.first_name,
        LAST_LOGIN: user.last_login,
        TOKEN: resetToken,
      },
      'PasswordReset',
    )

    return {
      message: 'Email with reset instructions sent successfully',
    }
  } catch (error) {
    throw createError({
      statusMessage: error.message,
      statusCode: 500,
    })
  }
}

// Verify password reset token
export const verifyPasswordResetQuery = async (token: string) => {
  const decodedToken = verifyResetToken(token)

  if (!decodedToken) {
    throw new Error('Invalid token')
  }

  if (
    decodedToken.jti !== (await addOneTimeToken(decodedToken.jti, new Date()))
  ) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    })
  }

  try {
    const password = await generateNewPassword(decodedToken.user.uuid)

    return {
      message: 'Token verified successfully',
      password: password,
      cookies: {
        'access-token': '',
        'refresh-token': '',
        'session-id': '',
        'csrf-token': '',
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate new password',
    })
  }
}

// Get user by ID
export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: userInclude,
  })
  user.password = undefined
  return user
}

export async function generateNewPassword(
  uuid: string,
): Promise<Error | string> {
  const error = null

  // Generate secure password consistent with password policy
  const password = passwordGenerator.generate({
    length: 20,
    numbers: true,
    symbols: true,
    strict: true,
  })

  // Check if password passes password policy
  const isValidPassword = validatePassword(password)
  if (!isValidPassword) {
    return createError({
      statusCode: 500,
      statusMessage: 'Server error',
    })
  }

  // Hash password
  const errorOrHashedPassword = await hashPassword(password)

  const hashedPassword = errorOrHashedPassword as string

  try {
    await prisma.user.update({
      where: {
        uuid: uuid,
      },
      data: {
        password: hashedPassword,
      },
    })
    return password
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    })
  }
}

export async function addOneTimeToken(
  tokenId: string,
  expiresAt: Date,
): Promise<Error | string> {
  try {
    await prisma.onetimetoken.create({
      data: {
        token_id: tokenId,
        expires_at: expiresAt,
      },
    })

    return tokenId
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    })
  }
}
