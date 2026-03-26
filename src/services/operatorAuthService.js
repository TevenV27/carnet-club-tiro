import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { secondaryAuth } from '../firebase/config'

/** Firebase exige contraseña mínimo 6 caracteres */
export function passwordFromCedula(cedula) {
  const s = String(cedula ?? '').trim()
  if (s.length >= 6) return s
  return s.padEnd(6, '0')
}

/**
 * Crea usuario en Firebase Auth (email + contraseña = cédula ajustada a 6+ chars).
 * Usa auth secundaria para no desloguear al admin.
 * @returns {{ uid?: string, skipped?: boolean, reason?: string }}
 */
export async function createOperatorFirebaseUser(email, cedula) {
  const normalizedEmail = String(email).trim().toLowerCase()
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Correo inválido para crear la cuenta del operador.')
  }

  const pwd = passwordFromCedula(cedula)

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, pwd)
    await signOut(secondaryAuth)
    return { uid: cred.user.uid }
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      return { skipped: true, reason: 'email-already-in-use' }
    }
    await signOut(secondaryAuth).catch(() => {})
    throw err
  }
}
