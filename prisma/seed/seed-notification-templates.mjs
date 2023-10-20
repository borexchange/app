import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const notificationTemplates = [
  {
    id: 1,
    name: 'EmailVerification',
    subject: 'Please verify your email',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>You recently created an account at %URL% on %CREATED_AT%. Please verify your email to continue with your account. Please follow the link below to verify your email.</p>\n<p>Follow the link to verify your email: %URL%/confirm/verifyemail?token=%TOKEN%</p>',
    short_codes: '["FIRSTNAME", "CREATED_AT", "TOKEN"]',
    email: true,
  },
  {
    id: 2,
    name: 'PasswordReset',
    subject: 'Password Reset Request',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>You requested to reset your password. Please follow the link below. If you did not request to reset your password, disregard this email. Your last login time was: %LAST_LOGIN%.</p>\n<p>This is a one-time password link that will reveal a temporary password.</p>\n<p>Password reset link: %URL%/confirm/password-reset?token=%TOKEN%</p>',
    short_codes: '["FIRSTNAME", "LAST_LOGIN", "TOKEN"]',
    email: true,
  },
  {
    id: 3,
    name: 'EmailTest',
    subject: 'Email System Test',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your email system at %URL% is working as expected. This test email was sent on %TIME%.</p>\n<p>If you did not expect this email, please contact support.</p>',
    short_codes: '["FIRSTNAME", "TIME"]',
    email: true,
  },
  {
    id: 4,
    name: 'KycSubmission',
    subject: 'KYC Submission Confirmation',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Thank you for submitting your KYC application on %CREATED_AT%. Your application is now under review.</p>\n<p>Level: %LEVEL%</p>\n<p>Status: %STATUS%</p>',
    short_codes: '["FIRSTNAME", "CREATED_AT", "LEVEL", "STATUS"]',
    email: true,
  },
  {
    id: 5,
    name: 'KycUpdate',
    subject: 'KYC Update Confirmation',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your KYC application has been updated on %UPDATED_AT%. It is now under review again.</p>\n<p>Updated Level: %LEVEL%</p>\n<p>Status: %STATUS%</p>',
    short_codes: '["FIRSTNAME", "UPDATED_AT", "LEVEL", "STATUS"]',
    email: true,
  },
  {
    id: 6,
    name: 'KycApproved',
    subject: 'Your KYC Application has been Approved',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your KYC application submitted on %UPDATED_AT% has been approved.</p>\n<p>Your current level is: %LEVEL%</p>\n<p>Thank you for your cooperation.</p>\n<p>Best regards,</p>\n<p>Team [Your Company]</p>',
    short_codes: '["FIRSTNAME", "UPDATED_AT", "LEVEL"]',
    email: true,
  },
  {
    id: 7,
    name: 'KycRejected',
    subject: 'Your KYC Application has been Rejected',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Unfortunately, your KYC application submitted on %UPDATED_AT% has been rejected.</p>\n<p>Reason: %MESSAGE%</p>\n<p>Please contact our support team for more information.</p>\n<p>Best regards,</p>\n<p>Team [Your Company]</p>',
    short_codes: '["FIRSTNAME", "UPDATED_AT", "MESSAGE", "LEVEL"]',
    email: true,
  },
  {
    id: 8,
    name: 'NewInvestmentCreated',
    subject: 'New Investment Created',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>You have successfully created a new investment in the %PLAN_NAME% plan.</p>\n<p>Amount Invested: %AMOUNT% %CURRENCY%</p>\n<p>Duration: %DURATION% days</p>\n<p>Expected ROI: %ROI%</p>\n<p>Status: %STATUS%</p>',
    short_codes:
      '["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "DURATION", "ROI", "STATUS"]',
    email: true,
  },
  {
    id: 9,
    name: 'InvestmentUpdated',
    subject: 'Investment Updated',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your investment in the %PLAN_NAME% plan has been updated.</p>\n<p>New Amount: %AMOUNT% %CURRENCY%</p>\n<p>New Duration: %DURATION% days</p>\n<p>New Expected ROI: %ROI%</p>\n<p>Status: %STATUS%</p>',
    short_codes:
      '["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "DURATION", "ROI", "STATUS"]',
    email: true,
  },
  {
    id: 10,
    name: 'InvestmentCanceled',
    subject: 'Investment Canceled',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your investment in the %PLAN_NAME% plan has been canceled.</p>\n<p>Amount Returned: %AMOUNT% %CURRENCY%</p>\n<p>Status: %STATUS%</p>',
    short_codes: '["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"]',
    email: true,
  },
  {
    id: 11,
    name: 'UserMessage',
    subject: 'New Message From Support',
    email_body:
      '<p>Dear %RECEIVER_NAME%,</p>\n<p>You have a new message from our support team regarding ticket ID: %TICKET_ID%.</p>\n<p>Message:</p>\n<p>%MESSAGE%</p>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes: '["RECEIVER_NAME", "TICKET_ID", "MESSAGE"]',
    email: true,
  },
  {
    id: 12,
    name: 'SupportMessage',
    subject: 'New User Message',
    email_body:
      '<p>Dear %RECEIVER_NAME%,</p>\n<p>You have a new message from %SENDER_NAME% regarding ticket ID: %TICKET_ID%.</p>\n<p>Message:</p>\n<p>%MESSAGE%</p>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes: '["RECEIVER_NAME", "SENDER_NAME", "TICKET_ID", "MESSAGE"]',
    email: true,
  },
  {
    id: 13,
    name: 'FiatWalletTransaction',
    subject: 'Transaction Alert: %TRANSACTION_TYPE%',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>You have recently made a %TRANSACTION_TYPE% transaction.</p>\n<p>Details:</p>\n<ul>\n<li>Transaction ID: %TRANSACTION_ID%</li>\n<li>Amount: %AMOUNT% %CURRENCY%</li>\n<li>Status: %TRANSACTION_STATUS%</li>\n<li>Current Wallet Balance: %NEW_BALANCE% %CURRENCY%</li>\n<li>Description: %DESCRIPTION%</li>\n</ul>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "TRANSACTION_TYPE", "TRANSACTION_ID", "AMOUNT", "CURRENCY", "TRANSACTION_STATUS", "NEW_BALANCE", "DESCRIPTION"]',
    email: true,
  },
  {
    id: 14,
    name: 'BinaryOrderResult',
    subject: 'Binary Order Result: %RESULT%',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Here is the outcome of your recent binary order (ID: %ORDER_ID%).</p>\n<p><strong>Order Details:</strong></p>\n<ul>\n  <li><strong>Market:</strong> %MARKET%</li>\n  <li><strong>Amount:</strong> %AMOUNT% %CURRENCY%</li>\n  <li><strong>Entry Price:</strong> %ENTRY_PRICE%</li>\n  <li><strong>Closed at Price:</strong> %CLOSE_PRICE%</li>\n</ul>\n<p><strong>Order Outcome:</strong></p>\n<ul>\n  <li><strong>Result:</strong> %RESULT%</li>\n  <li><strong>Profit/Loss:</strong> %PROFIT% %CURRENCY%</li>\n  <li><strong>Side:</strong> %SIDE%</li>\n</ul>\n<p>Thank you for using our platform.</p>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "ORDER_ID", "RESULT", "MARKET", "AMOUNT", "PROFIT", "SIDE", "CURRENCY", "ENTRY_PRICE", "CLOSE_PRICE"]',
    email: true,
  },
  {
    id: 15,
    name: 'WalletBalanceUpdate',
    subject: 'Wallet Balance Update',
    email_body:
      '<p>Hello %FIRSTNAME%,</p>\n<p>Your wallet balance has been %ACTION% by an admin.</p>\n<p>Details:</p>\n<ul>\n<li>Action: %ACTION%</li>\n<li>Amount: %AMOUNT% %CURRENCY%</li>\n<li>New Balance: %NEW_BALANCE% %CURRENCY%</li>\n</ul>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes: '["FIRSTNAME", "ACTION", "AMOUNT", "CURRENCY", "NEW_BALANCE"]',
    email: true,
  },
  {
    id: 16,
    name: 'TransactionStatusUpdate',
    subject: 'Transaction Status Update: %TRANSACTION_TYPE%',
    email_body:
      '<p>Hello %FIRSTNAME%,</p>\n<p>Your transaction of type %TRANSACTION_TYPE% has been updated.</p>\n<p>Details:</p>\n<ul>\n<li>Transaction ID: %TRANSACTION_ID%</li>\n<li>Status: %TRANSACTION_STATUS%</li>\n<li>Amount: %AMOUNT% %CURRENCY%</li>\n<li>Updated Balance: %NEW_BALANCE% %CURRENCY%</li>\n<li>Note: %NOTE%</li>\n</ul>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "TRANSACTION_TYPE", "TRANSACTION_ID", "TRANSACTION_STATUS", "AMOUNT", "CURRENCY", "NEW_BALANCE", "NOTE"]',
    email: true,
  },
  {
    id: 17,
    name: 'AuthorStatusUpdate',
    subject: 'Author Application Status: %AUTHOR_STATUS%',
    email_body:
      '<p>Hello %FIRSTNAME%,</p>\n<p>Your application to join our Authorship Program has been %AUTHOR_STATUS%.</p>\n<p>Details:</p>\n<ul>\n<li>Application ID: %APPLICATION_ID%</li>\n<li>Status: %AUTHOR_STATUS%</li>\n</ul>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes: '["FIRSTNAME", "AUTHOR_STATUS", "APPLICATION_ID"]',
    email: true,
  },
  {
    id: 18,
    name: 'OutgoingWalletTransfer',
    subject: 'Outgoing Wallet Transfer Confirmation',
    email_body:
      '<p>Hello %FIRSTNAME%,</p>\n<p>You have successfully transferred %AMOUNT% %CURRENCY% to %RECIPIENT_NAME%.</p>\n<p>Your new balance: %NEW_BALANCE% %CURRENCY%</p>\n<p>Transaction ID: %TRANSACTION_ID%</p>',
    short_codes:
      '["FIRSTNAME", "AMOUNT", "CURRENCY", "NEW_BALANCE", "TRANSACTION_ID", "RECIPIENT_NAME"]',
    email: true,
  },
  {
    id: 19,
    name: 'IncomingWalletTransfer',
    subject: 'Incoming Wallet Transfer Confirmation',
    email_body:
      '<p>Hello %FIRSTNAME%,</p>\n<p>You have received %AMOUNT% %CURRENCY% from %SENDER_NAME%.</p>\n<p>Your new balance: %NEW_BALANCE% %CURRENCY%</p>\n<p>Transaction ID: %TRANSACTION_ID%</p>',
    short_codes:
      '["FIRSTNAME", "AMOUNT", "CURRENCY", "NEW_BALANCE", "TRANSACTION_ID", "SENDER_NAME"]',
    email: true,
  },
  {
    id: 20,
    name: 'SpotWalletWithdrawalConfirmation',
    subject: 'Confirmation: Spot Wallet Withdrawal',
    email_body:
      '<p>Dear %FIRSTNAME%,</p><p>You have successfully initiated a withdrawal from your Spot Wallet.</p><p>Details:</p><ul><li>Amount: %AMOUNT% %CURRENCY%</li><li>Address: %ADDRESS%</li><li>Transaction Fee: %FEE%</li><li>Network Chain: %CHAIN%</li><li>Memo: %MEMO%</li><li>Status: %STATUS%</li></ul><p>If you did not make this request, please contact our support immediately.</p><p>Best regards,</p><p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "AMOUNT", "CURRENCY", "ADDRESS", "FEE", "CHAIN", "MEMO", "STATUS"]',
    email: true,
  },
  {
    id: 21,
    name: 'SpotWalletDepositConfirmation',
    subject: 'Confirmation: Spot Wallet Deposit',
    email_body:
      '<p>Dear %FIRSTNAME%,</p><p>Your spot wallet deposit has been successfully processed.</p><p>Details:</p><ul><li>Transaction ID: %TRANSACTION_ID%</li><li>Amount: %AMOUNT% %CURRENCY%</li><li>Network Chain: %CHAIN%</li><li>Transaction Fee: %FEE%</li><li>Status: COMPLETED</li></ul><p>If you did not make this deposit, please contact our support immediately.</p><p>Best regards,</p><p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "TRANSACTION_ID", "AMOUNT", "CURRENCY", "CHAIN", "FEE"]',
    email: true,
  },
  {
    id: 22,
    name: 'NewAiInvestmentCreated',
    subject: 'New AI Investment Initiated',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>You have successfully created a new AI investment in the %PLAN_NAME% plan.</p>\n<p>Amount Invested: %AMOUNT% %CURRENCY%</p>\n<p>Duration: %DURATION% %TIMEFRAME%</p>\n<p>Status: %STATUS%</p>',
    short_codes:
      '["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "DURATION", "TIMEFRAME", "STATUS"]',
    email: true,
  },
  {
    id: 23,
    name: 'AiInvestmentCompleted',
    subject: 'AI Investment Completed',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your AI investment in the %PLAN_NAME% plan has been completed.</p>\n<p>Invested Amount: %AMOUNT% %CURRENCY%</p>\n<p>Result: %PROFIT% %CURRENCY%</p>\n<p>Status: %STATUS%</p>',
    short_codes:
      '["FIRSTNAME", "PLAN_NAME","AMOUNT", "PROFIT", "CURRENCY", "STATUS"]',
    email: true,
  },
  {
    id: 24,
    name: 'AiInvestmentCanceled',
    subject: 'AI Investment Canceled',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your AI investment in the %PLAN_NAME% plan has been canceled.</p>\n<p>Amount Refunded: %AMOUNT% %CURRENCY%</p>\n<p>Status: %STATUS%</p>',
    short_codes: '["FIRSTNAME", "PLAN_NAME", "AMOUNT", "CURRENCY", "STATUS"]',
    email: true,
  },
  {
    id: 25,
    name: 'WithdrawalStatus',
    subject: 'Withdrawal Status: %STATUS%',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your withdrawal request has been %STATUS%.</p>\n<p>If the withdrawal is canceled, the reason is: %REASON%.</p>\n<p>Transaction ID: %TRANSACTION_ID%</p>\n<p>Amount: %AMOUNT% %CURRENCY%</p>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "STATUS", "REASON", "TRANSACTION_ID", "AMOUNT", "CURRENCY"]',
    email: true,
  },
  {
    id: 26,
    name: 'DepositConfirmation',
    subject: 'Deposit Confirmation',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your deposit has been successfully confirmed.</p>\n<p>Transaction ID: %TRANSACTION_ID%</p>\n<p>Amount: %AMOUNT% %CURRENCY%</p>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes: '["FIRSTNAME", "TRANSACTION_ID", "AMOUNT", "CURRENCY"]',
    email: true,
  },
  {
    id: 27,
    name: 'TransferConfirmation',
    subject: 'Transfer Confirmation',
    email_body:
      '<p>Dear %FIRSTNAME%,</p>\n<p>Your transfer has been successfully completed.</p>\n<p>Transaction ID: %TRANSACTION_ID%</p>\n<p>Amount: %AMOUNT% %CURRENCY%</p>\n<p>To: %RECIPIENT_NAME%</p>\n<p>Best regards,</p>\n<p>Your Support Team</p>',
    short_codes:
      '["FIRSTNAME", "TRANSACTION_ID", "AMOUNT", "CURRENCY", "RECIPIENT_NAME"]',
    email: true,
  },
]

async function main() {
  const emailTemplatePromises = notificationTemplates.map((template) => {
    return prisma.notification_templates.upsert({
      where: { id: template.id },
      update: { short_codes: template.short_codes },
      create: template,
    })
  })
  await Promise.all(emailTemplatePromises)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
