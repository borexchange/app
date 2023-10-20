import crypto from 'crypto'
import { removeSystemReport, storeSystemReport } from './system'

let dynamicEncryptionKey: Buffer | null = null
const encryptedKey = process.env.ENCRYPTED_ENCRYPTION_KEY

// Function to decrypt the encryption key using the admin's passphrase
function decryptEncryptionKey(
  encryptedKey: string,
  passphrase: string,
): string {
  try {
    const [iv, authTag, cipherText, salt] = encryptedKey
      .split(':')
      .map((part) => Buffer.from(part, 'hex'))

    // Key derivation using PBKDF2
    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(cipherText, null, 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error.message)
    throw new Error('Decryption failed')
  }
}

export async function setEncryptionKey(passphrase: string) {
  try {
    const decryptedKey = decryptEncryptionKey(encryptedKey, passphrase)
    setDynamicEncryptionKey(decryptedKey)

    // Remove any existing system report for this operation
    try {
      await removeSystemReport('SetEncryptionKey')
    } catch (error) {}

    return true
  } catch (error) {
    console.error('Failed to set the encryption key:', error)

    // Save a system report indicating that the operation failed
    await storeSystemReport(
      'SetEncryptionKey',
      `Failed to set the encryption key: ${error.message}`,
      false,
    )

    return false
  }
}

export function setDynamicEncryptionKey(key: string) {
  dynamicEncryptionKey = Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  if (!dynamicEncryptionKey) {
    throw new Error('Encryption key is not set')
  }

  const iv = crypto.randomBytes(12) // GCM recommends 12 bytes
  const cipher = crypto.createCipheriv('aes-256-gcm', dynamicEncryptionKey, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex') // Get the authentication tag
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decrypt(text: string): string {
  if (!dynamicEncryptionKey) {
    throw new Error('Encryption key is not set')
  }

  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift(), 'hex')
  const authTag = Buffer.from(textParts.shift(), 'hex')
  const encryptedText = textParts.join(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    dynamicEncryptionKey,
    iv,
  )
  decipher.setAuthTag(authTag) // Set the authentication tag for decryption
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function isUnlockedEcosystemVault(): boolean {
  return !!dynamicEncryptionKey
}
