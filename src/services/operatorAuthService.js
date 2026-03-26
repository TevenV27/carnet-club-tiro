import {
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    signInWithEmailAndPassword,
    signOut,
    updateEmail
} from 'firebase/auth'
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

const normalizeEmail = (e) => String(e ?? '').trim().toLowerCase()

function collectOldEmailCandidates(oldEmail, oldEmailCandidates) {
  const out = []
  const push = (v) => {
    const n = normalizeEmail(v)
    if (n.includes('@') && !out.includes(n)) out.push(n)
  }
  if (Array.isArray(oldEmailCandidates)) {
    for (const c of oldEmailCandidates) push(c)
  }
  push(oldEmail)
  return out
}

function isCredentialLikeError(err) {
  const code = err?.code
  const msg = String(err?.message ?? '')
  return (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email' ||
    msg.includes('INVALID_LOGIN_CREDENTIALS')
  )
}

/**
 * Actualiza el email en Firebase Auth del operador (misma app secundaria que la creación).
 * Inicia sesión con el correo anterior + contraseña derivada de la cédula y aplica updateEmail.
 * Puede recibir varios correos candidatos (p. ej. carnet vs usuarios) si Firestore estaba desincronizado.
 */
export async function updateOperatorFirebaseEmail({
  oldEmail,
  oldEmailCandidates,
  newEmail,
  cedula,
  expectedAuthUid
}) {
  const normalizedNew = normalizeEmail(newEmail)

  if (!normalizedNew.includes('@')) {
    return {
      ok: false,
      code: 'invalid-new-email',
      friendlyMessage: 'El correo nuevo no es válido.'
    }
  }

  const candidates = collectOldEmailCandidates(oldEmail, oldEmailCandidates).filter(
    (c) => c !== normalizedNew
  )

  if (candidates.length === 0) {
    return { ok: true, skipped: true }
  }

  const pwd = passwordFromCedula(cedula)
  let lastErr = null
  const failureCodes = []

  for (let i = 0; i < candidates.length; i++) {
    const normalizedOld = candidates[i]
    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, normalizedOld, pwd)
      if (expectedAuthUid && cred.user.uid !== expectedAuthUid) {
        await signOut(secondaryAuth)
        return {
          ok: false,
          code: 'uid-mismatch',
          friendlyMessage:
            'El correo guardado no coincide con la cuenta vinculada (authUid). Revisa en Firebase Console.'
        }
      }
      await updateEmail(cred.user, normalizedNew)
      await signOut(secondaryAuth)
      return { ok: true }
    } catch (err) {
      await signOut(secondaryAuth).catch(() => {})
      lastErr = err
      const c = err?.code || (String(err?.message ?? '').includes('INVALID_LOGIN_CREDENTIALS')
        ? 'auth/invalid-credential'
        : null)
      if (c) failureCodes.push(c)
      const tryNext = i < candidates.length - 1 && isCredentialLikeError(err)
      if (tryNext) continue
      break
    }
  }

  const err = lastErr
  const code = err?.code
  const onlyUserNotFound =
    failureCodes.length > 0 && failureCodes.every((c) => c === 'auth/user-not-found')

  let friendlyMessage = err?.message || String(err)
  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    String(err?.message ?? '').includes('INVALID_LOGIN_CREDENTIALS')
  ) {
    friendlyMessage =
      'No se pudo verificar la cuenta con el correo registrado y la contraseña basada en la cédula. Si borraste la cuenta en Authentication, el sistema puede crearla de nuevo si el error era solo “usuario no encontrado”. Si el operador cambió la contraseña, restablécela.'
  } else if (code === 'auth/email-already-in-use') {
    friendlyMessage = 'Ese correo ya está registrado en Authentication.'
  } else if (code === 'auth/user-not-found') {
    friendlyMessage =
      'No hay cuenta con ninguno de los correos guardados (carnet/usuario). Puede estar desincronizado con Firebase Auth.'
  }
  return {
    ok: false,
    code,
    friendlyMessage,
    error: err?.message,
    onlyUserNotFound
  }
}

/**
 * True si ningún correo antiguo tiene cuenta en Auth y el correo nuevo está libre.
 * Sirve cuando borraste el usuario en la consola: el login falla con invalid-credential.
 * Nota: con "email enumeration protection" activo en Firebase, esto puede devolver true de más.
 */
export async function noOperatorAuthAccountsForEmails(oldEmailCandidates, newEmail) {
  const olds = collectOldEmailCandidates(undefined, oldEmailCandidates)
  const newN = normalizeEmail(newEmail)
  if (!newN.includes('@')) return false

  const newMethods = await fetchSignInMethodsForEmail(secondaryAuth, newN)
  if (newMethods.length > 0) return false

  for (const e of olds) {
    if (e === newN) continue
    const m = await fetchSignInMethodsForEmail(secondaryAuth, e)
    if (m.length > 0) return false
  }
  return olds.length > 0
}

/**
 * Crea de nuevo la cuenta del operador (p. ej. cuenta borrada en Authentication y Firestore aún tenía authUid).
 * Úsalo tras fallar updateEmail cuando no hay sesión posible con el correo antiguo.
 */
export async function recreateOperatorAuthAfterDeletion({ newEmail, cedula }) {
  const normalizedNew = normalizeEmail(newEmail)
  if (!normalizedNew.includes('@')) {
    return { ok: false, friendlyMessage: 'El correo nuevo no es válido.' }
  }
  const authRes = await createOperatorFirebaseUser(normalizedNew, cedula)
  if (authRes.uid) {
    return { ok: true, uid: authRes.uid }
  }
  if (authRes.skipped && authRes.reason === 'email-already-in-use') {
    return {
      ok: false,
      friendlyMessage:
        'Ese correo ya está registrado en Authentication. Elimina la cuenta duplicada en la consola o usa otro correo.'
    }
  }
  return { ok: false, friendlyMessage: 'No se pudo crear la nueva cuenta de acceso.' }
}
