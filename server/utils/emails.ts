import sgMail from '@sendgrid/mail'
import fs from 'fs'
import nodemailer from 'nodemailer'
import type { Transaction, User, Wallet } from '../types'
import { createError } from './index'
import prisma from './prisma'

import { createLogger } from '../logger'
const logger = createLogger('Email')

const rootPath = `${process.cwd()}/.app`

const APP_EMAILER = process.env.APP_EMAILER || 'nodemailer-service'
const APP_NODEMAILER_SERVICE = process.env.APP_NODEMAILER_SERVICE || ''
const APP_NODEMAILER_SERVICE_SENDER =
  process.env.APP_NODEMAILER_SERVICE_SENDER || ''
const APP_NODEMAILER_SERVICE_PASSWORD =
  process.env.APP_NODEMAILER_SERVICE_PASSWORD || ''
const APP_NODEMAILER_SMTP_SENDER = process.env.APP_NODEMAILER_SMTP_SENDER || ''
const APP_NODEMAILER_SMTP_PASSWORD =
  process.env.APP_NODEMAILER_SMTP_PASSWORD || ''
const APP_NODEMAILER_SMTP_HOST =
  process.env.APP_NODEMAILER_SMTP_HOST || 'smtp.gmail.com'
const APP_NODEMAILER_SMTP_PORT = process.env.APP_NODEMAILER_SMTP_PORT || '465'
const APP_NODEMAILER_SMTP_ENCRYPTION =
  process.env.APP_NODEMAILER_SMTP_ENCRYPTION || 'ssl'
const APP_SENDGRID_API_KEY = process.env.APP_SENDGRID_API_KEY || ''
const APP_SENDGRID_SENDER = process.env.APP_SENDGRID_SENDER || ''
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || ''
const APP_PUBLIC_SITE_NAME = process.env.APP_PUBLIC_SITE_NAME || ''

export interface EmailOptions {
  to: string
  from?: string
  subject: string
  html?: string
  text?: string
}

export async function sendEmail(
  specificVariables: any,
  templateName: string,
): Promise<Error | true> {
  let processedTemplate: string
  let processedSubject: string
  let templateRecord: any

  try {
    const result = await fetchAndProcessEmailTemplate(
      specificVariables,
      templateName,
    )
    processedTemplate = result.processedTemplate
    processedSubject = result.processedSubject // New line
    templateRecord = result.templateRecord
  } catch (error) {
    return error
  }

  const finalEmailHtml = await prepareEmailTemplate(
    processedTemplate,
    processedSubject,
  )

  const options: EmailOptions = {
    to: specificVariables['TO'] as string,
    subject: processedSubject,
    html: finalEmailHtml,
  }
  const emailer = APP_EMAILER

  try {
    return await sendEmailWithProvider(emailer, options)
  } catch (error) {
    return error
  }
}

async function sendEmailWithProvider(provider: string, options: EmailOptions) {
  if (provider === 'nodemailer-service') {
    options.from = APP_NODEMAILER_SERVICE_SENDER
    return await emailWithNodemailerService(
      APP_NODEMAILER_SERVICE_SENDER,
      APP_NODEMAILER_SERVICE_PASSWORD,
      APP_NODEMAILER_SERVICE,
      options,
    )
  }
  if (provider === 'nodemailer-smtp') {
    options.from = APP_NODEMAILER_SMTP_SENDER
    return await emailWithNodemailerSmtp(
      APP_NODEMAILER_SMTP_SENDER,
      APP_NODEMAILER_SMTP_PASSWORD,
      APP_NODEMAILER_SMTP_HOST,
      APP_NODEMAILER_SMTP_PORT,
      APP_NODEMAILER_SMTP_ENCRYPTION === 'ssl',
      options,
    )
  }
  if (provider === 'nodemailer-sendgrid') {
    options.from = APP_SENDGRID_SENDER
    return await emailWithSendgrid(options)
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Unknown email provider',
  })
}

/**
 * @desc Sends email with Sendgrid
 * @param options Email message options like to, from etc.
 * @returns {Promise<Error | true>}
 */
export async function emailWithSendgrid(
  options: EmailOptions,
): Promise<Error | true> {
  const apiKey = APP_SENDGRID_API_KEY
  let emailError = null

  // If Sendgrid api key not found
  if (!apiKey) {
    logger.error('Sendgrid Api key not found. Cannot send email. Aborting.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Attempting to send mail with Sendgrid
  sgMail.setApiKey(apiKey)

  // Create messag object
  const msg = {
    to: options.to,
    from: options.from, // Change to your verified sender
    subject: options.subject,
    html: options.html ? options.html : options.text,
  }

  await sgMail.send(msg).catch((error) => {
    logger.error(`Error when sending email in Sendgrid: ${error}`)
    emailError = error
  })

  // If error, return error
  if (emailError) {
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // If successful
  return true
}

/**
 *@desc Sends email using Nodemailer service (e.g. hotmail)
 * @param sender Sender's email address
 * @param password Sender's password
 * @param service Sender's service such as hotmail
 * @param options Options for email such as to, from, subject etc.
 * @returns
 */
export async function emailWithNodemailerService(
  sender: string,
  password: string,
  service: string,
  options: EmailOptions,
): Promise<Error | true> {
  // Error flag
  let errorFound = null

  const emailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  }

  if (!service) {
    logger.error('Error: Email service not specified. Aborting email send.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Check for email user
  if (!sender) {
    logger.error('Error: Email user not specified. Aborting email send.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Check for password
  if (!password) {
    logger.error('Error: Email password not specified. Aborting email send.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: service,
    auth: {
      user: sender,
      pass: password,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  })

  // Check if email server is ready to take our messages
  transporter.verify(function (error: any, success: any) {
    if (error) {
      logger.error(`Error when verifying email server: ${error}`)
      errorFound = error
    }
  })

  // If transporter verify error, return
  if (errorFound)
    throw createError({ statusCode: 500, statusMessage: 'Server error' })

  // Attempt to send email
  transporter.sendMail(emailOptions, (err: any, result: any) => {
    // If error, log error and return
    if (err) {
      logger.error(`Error when sending email: ${err}`)
      errorFound = err
    }
  })

  // If errorFound, return error
  if (errorFound)
    throw createError({ statusCode: 500, statusMessage: 'Server error' })

  // Otherwise successful
  return true
}

/**
 * @desc Sends email using Nodemailer SMTP
 * @param sender Sender's email address
 * @param password Sender's password
 * @param host Email server host
 * @param port Email server port
 * @param options Options for email such as to, from, subject etc.
 * @returns
 */
export async function emailWithNodemailerSmtp(
  sender: string,
  password: string,
  host: string,
  port: string,
  smtpEncryption: boolean,
  options: EmailOptions,
): Promise<Error | true> {
  // Error flag
  let errorFound = null

  const emailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  }

  // Sending email using nodemailer-service

  if (!host) {
    logger.error('Error: Email host not specified. Aborting email send.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Check for email user
  if (!sender) {
    logger.error('Error: Email user not specified. Aborting email send.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Check for password
  if (!sender) {
    logger.error('Error: Email password not specified. Aborting email send.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    pool: true,
    secure: false, // use STARTTLS if the server supports it
    auth: {
      user: sender,
      pass: password,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  })

  // Check if email server is ready to take our messages
  transporter.verify(function (error: any, success: any) {
    if (error) {
      logger.error(`Error when verifying email server: ${error}`)
      errorFound = error
    }
  })

  // If transporter verify error, return
  if (errorFound)
    throw createError({ statusCode: 500, statusMessage: 'Server error' })

  // Attempt to send email
  transporter.sendMail(emailOptions, (err: any, result: any) => {
    // If error, log error and return
    if (err) {
      logger.error(`Error when sending email: ${err}`)
      errorFound = err
    }
  })

  // If errorFound, return error
  if (errorFound)
    throw createError({ statusCode: 500, statusMessage: 'Server error' })

  // Otherwise successful
  return true
}

// Function to prepare the email template
async function prepareEmailTemplate(
  processedTemplate: string,
  processedSubject: string,
): Promise<string> {
  const generalTemplate = fs.readFileSync(
    `${rootPath}/data/emails/generalTemplate.html`,
    'utf-8',
  )

  if (!generalTemplate) {
    logger.error('General email template not found')
    throw createError({
      statusCode: 500,
      statusMessage: 'General email template not found',
    })
  }

  // Fetching both 'full_logo' and 'site_name' in a single query
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: ['full_logo', 'site_name'],
      },
    },
  })

  // Convert the settings array to an object for easier access
  const settingsObj = Object.fromEntries(
    settings.map((setting) => [setting.key, setting.value]),
  )

  // Define values to replace placeholders in the email template
  const replacements = {
    '%SITE_URL%': APP_PUBLIC_URL, // Replace with the public URL of the app
    '%HEADER%': settingsObj['full_logo']
      ? `<img src="${APP_PUBLIC_URL}${settingsObj['full_logo']}" style="max-height:96px;" />` // Replace with the logo image if available
      : `<h1>${
          settingsObj['site_name'] || APP_PUBLIC_SITE_NAME || 'Bicrypto'
        }</h1>`, // Otherwise, replace with the site name
    '%MESSAGE%': processedTemplate, // Replace with the processed email template
    '%SUBJECT%': processedSubject, // Replace with the processed email subject
    '%FOOTER%': settingsObj['site_name'] || APP_PUBLIC_SITE_NAME || 'Bicrypto', // Replace with the footer text
  }

  return Object.entries(replacements).reduce(
    (acc, [key, value]) => replaceAllOccurrences(acc, key, value),
    generalTemplate,
  )
}

async function fetchAndProcessEmailTemplate(
  specificVariables: any,
  templateName: string,
): Promise<{
  processedTemplate: string
  processedSubject: string
  templateRecord: any
}> {
  const templateRecord = await prisma.notification_templates.findUnique({
    where: { name: templateName },
  })

  if (!templateRecord || !templateRecord.email || !templateRecord.email_body) {
    logger.error('Email template not found or email not enabled')
    throw createError({
      statusCode: 404,
      statusMessage: 'Email template not found or email not enabled',
    })
  }

  const basicVariables = {
    URL: APP_PUBLIC_URL,
  }

  const variables = { ...basicVariables, ...specificVariables }

  // Process the email body
  const processedTemplate = replaceTemplateVariables(
    templateRecord.email_body,
    variables,
  )

  // Process the email subject
  const processedSubject = replaceTemplateVariables(
    templateRecord.subject,
    variables,
  )

  return { processedTemplate, processedSubject, templateRecord }
}

export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>,
): string {
  return Object.entries(variables).reduce(
    (acc, [key, value]) =>
      acc.replace(new RegExp(`%${key}%`, 'g'), String(value)),
    template,
  )
}

function replaceAllOccurrences(
  str: string,
  search: string | RegExp,
  replace: string,
): string {
  const regex = new RegExp(search, 'g')
  return str.replace(regex, replace)
}

export async function sendKycEmail(user: any, kyc: any, emailType: string) {
  const timestampLabel =
    emailType === 'KycSubmission' ? 'CREATED_AT' : 'UPDATED_AT'
  const timestampDate =
    emailType === 'KycSubmission'
      ? new Date(kyc.created_at).toISOString()
      : new Date(kyc.updated_at).toISOString()
  const emailTemplate = emailType

  const emailData: Record<string, string | number> = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    [timestampLabel]: timestampDate,
    LEVEL: kyc.level,
    STATUS: kyc.status,
  }

  if (emailType === 'KycRejected' && kyc.notes) {
    emailData['MESSAGE'] = kyc.notes
  }

  const errorOrSent = await sendEmail(emailData, emailTemplate)

  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send ${emailType} email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendInvestmentEmail(
  user: any,
  investment: any,
  emailType: string,
) {
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    PLAN_NAME: investment.plan.name,
    AMOUNT: investment.amount.toString(),
    CURRENCY: investment.plan.currency,
    DURATION: investment.duration.toString(),
    ROI: investment.roi.toString(),
    STATUS: investment.status,
  }

  const errorOrSent = await sendEmail(emailData, emailType)

  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send ${emailType} email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendChatEmail(
  sender: any,
  receiver: any,
  chat: any,
  message: any,
  emailType: string,
) {
  const emailData = {
    TO: receiver.email,
    SENDER_NAME: sender.first_name,
    RECEIVER_NAME: receiver.first_name,
    MESSAGE: message.text,
    TICKET_ID: chat.uuid,
  }

  const errorOrSent = await sendEmail(emailData, emailType)

  if (errorOrSent instanceof Error) {
    logger.error(
      `Failed to send ${
        emailType === 'UserMessage' ? 'User' : 'Support'
      } message email:`,
      errorOrSent,
    )
    return errorOrSent
  }

  return true
}

export async function sendFiatTransactionEmail(
  user: any,
  transaction: any,
  newBalance: number,
) {
  // Define the type of email template to use, which matches the SQL record
  const emailTemplate = 'FiatWalletTransaction'

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    TRANSACTION_TYPE: transaction.type,
    TRANSACTION_ID: transaction.uuid,
    AMOUNT: transaction.amount,
    CURRENCY: transaction.wallet.currency,
    TRANSACTION_STATUS: transaction.status,
    NEW_BALANCE: newBalance,
    DESCRIPTION: transaction.description || 'N/A',
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Fiat Wallet Transaction email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendBinaryOrderEmail(user: any, order: any) {
  // Define the type of email template to use, which matches the SQL record
  const emailTemplate = 'BinaryOrderResult'

  let profit = 0
  let sign
  switch (order.status) {
    case 'WIN':
      profit = order.amount + order.amount * (order.profit / 100)
      sign = '+'
      break
    case 'LOSS':
      profit = order.amount
      sign = '-'
      break
    case 'DRAW':
      profit = 0
      sign = ''
      break
  }
  const currency = order.symbol.split('/')[1]

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    ORDER_ID: order.uuid,
    RESULT: order.status,
    MARKET: order.symbol,
    CURRENCY: currency,
    AMOUNT: order.amount,
    PROFIT: `${sign}${profit}`,
    ENTRY_PRICE: order.price,
    CLOSE_PRICE: order.close_price,
    SIDE: order.side,
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Binary Order Result email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendWalletBalanceUpdateEmail(
  user: any,
  wallet: any,
  action: 'added' | 'subtracted',
  amount: number,
  newBalance: number,
) {
  // Define the type of email template to use, which matches the SQL record
  const emailTemplate = 'WalletBalanceUpdate'

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    ACTION: action,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: newBalance,
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Wallet Balance Update email:`, errorOrSent)

    return errorOrSent
  }

  return true
}

export async function sendTransactionStatusUpdateEmail(
  user: any,
  transaction: any,
  wallet: any,
  newBalance: number,
  note?: string | null,
) {
  // Define the type of email template to use, which matches the SQL record
  const emailTemplate = 'TransactionStatusUpdate'

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    TRANSACTION_TYPE: transaction.type,
    TRANSACTION_ID: transaction.uuid,
    TRANSACTION_STATUS: transaction.status,
    AMOUNT: transaction.amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: newBalance,
    NOTE: note || 'N/A',
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Transaction Status Update email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendAuthorStatusUpdateEmail(user: any, author: any) {
  // Define the type of email template to use, which matches the SQL record
  const emailTemplate = 'AuthorStatusUpdate'

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    AUTHOR_STATUS: author.status,
    APPLICATION_ID: author.uuid,
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Author Status Update email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendOutgoingTransferEmail(
  user: any,
  toUser: any,
  wallet: any,
  amount: number,
  transactionId: string,
) {
  const emailTemplate = 'OutgoingWalletTransfer'
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: wallet.balance,
    TRANSACTION_ID: transactionId,
    RECIPIENT_NAME: `${toUser.first_name} ${toUser.last_name}`,
  }

  const errorOrSent = await sendEmail(emailData, emailTemplate)

  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Outgoing Wallet Transfer email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendIncomingTransferEmail(
  user: any,
  fromUser: any,
  wallet: any,
  amount: number,
  transactionId: string,
) {
  const emailTemplate = 'IncomingWalletTransfer'
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: wallet.balance,
    TRANSACTION_ID: transactionId,
    SENDER_NAME: `${fromUser.first_name} ${fromUser.last_name}`,
  }

  const errorOrSent = await sendEmail(emailData, emailTemplate)

  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send Incoming Wallet Transfer email:`, errorOrSent)
    return errorOrSent
  }

  return true
}

export async function sendSpotWalletWithdrawalConfirmationEmail(
  user: User,
  transaction: Transaction,
  wallet: Wallet,
) {
  // Define the type of email template to use, which matches the SQL record
  const emailTemplate = 'SpotWalletWithdrawalConfirmation'

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    AMOUNT: transaction.amount,
    CURRENCY: wallet.currency,
    ADDRESS: transaction.metadata.address,
    FEE: transaction.fee,
    CHAIN: transaction.metadata.chain,
    MEMO: transaction.metadata.memo || 'N/A',
    STATUS: transaction.status,
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(
      `Failed to send Spot Wallet Withdrawal Confirmation email:`,
      errorOrSent,
    )
    return errorOrSent
  }

  return true
}

export async function sendSpotWalletDepositConfirmationEmail(
  user: User,
  transaction: Transaction,
  wallet: Wallet,
) {
  // Define the type of email template to use, which should match the SQL record
  const emailTemplate = 'SpotWalletDepositConfirmation'

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    TRANSACTION_ID: transaction.reference_id,
    AMOUNT: transaction.amount,
    CURRENCY: wallet.currency,
    CHAIN: transaction.metadata.chain,
    FEE: transaction.fee,
  }

  // Send the email
  const errorOrSent = await sendEmail(emailData, emailTemplate)

  // Handle the outcome
  if (errorOrSent instanceof Error) {
    logger.error(
      `Failed to send Spot Wallet Deposit Confirmation email:`,
      errorOrSent,
    )
    return errorOrSent
  }

  return true
}

export async function sendAiInvestmentEmail(
  user: any,
  investment: any,
  emailType:
    | 'NewAiInvestmentCreated'
    | 'AiInvestmentCompleted'
    | 'AiInvestmentCanceled',
) {
  const resultSign =
    investment.result === 'WIN' ? '+' : investment.result === 'LOSS' ? '-' : ''
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    PLAN_NAME: investment.plan.title,
    AMOUNT: investment.amount.toString(),
    CURRENCY: investment.market.split('/')[1],
    DURATION: investment.duration.duration.toString(),
    TIMEFRAME: investment.duration.timeframe,
    STATUS: investment.status,
    PROFIT: `${resultSign}${investment.profit}` || 'N/A',
  }

  const errorOrSent = await sendEmail(emailData, emailType)

  if (errorOrSent instanceof Error) {
    logger.error(`Failed to send ${emailType} email:`, errorOrSent)
    return errorOrSent
  }

  return true
}
