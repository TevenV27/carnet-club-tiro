import { db } from '../firebase/config'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    where,
    increment
} from 'firebase/firestore'
import { logAction } from './logService'

const normalizeEmail = (e) => (e ? String(e).trim().toLowerCase() : null)

/** Firestore rechaza valores `undefined` en cualquier campo. */
const omitUndefined = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

export const upsertUserRecord = async ({ userBaseData, fotoBase64, userId, carnetId, authUid }) => {
    if (!userBaseData?.cedula) {
        console.warn('No se puede crear/actualizar el usuario sin un número de cédula válido.')
        return null
    }

    const userDocRef = doc(db, 'usuarios', userBaseData.cedula)
    const now = new Date()
    const emailNorm = normalizeEmail(userBaseData.email)

    const payload = {
        ...userBaseData,
        email: emailNorm ?? userBaseData.email ?? null,
        foto: fotoBase64 ?? null,
        userId,
        carnetId,
        carnetUpdatedAt: now,
        updatedAt: now
    }
    if (authUid) {
        payload.authUid = authUid
    }

    const existingUserSnapshot = await getDoc(userDocRef)

    if (existingUserSnapshot.exists()) {
        const existingData = existingUserSnapshot.data()
        const rol =
            existingData.rol ?? payload.rol ?? 'operador'

        await setDoc(
            userDocRef,
            omitUndefined({
                ...payload,
                // No degradar rol de administrador al actualizar carnet
                rol,
                createdAt: existingData.createdAt || now
            }),
            { merge: true }
        )

        // Registrar log
        await logAction(
            'actualizar',
            'usuarios',
            userDocRef.id,
            `Usuario actualizado: ${userBaseData.nombre || userBaseData.cedula}`,
            { cedula: userBaseData.cedula, nombre: userBaseData.nombre }
        )

        console.log('Usuario actualizado en colección usuarios. Cédula:', userBaseData.cedula)
        return { created: false, id: userDocRef.id }
    }

    await setDoc(
        userDocRef,
        omitUndefined({
            ...payload,
            rol: 'operador',
            createdAt: now
        })
    )

    // Registrar log
    await logAction(
        'crear',
        'usuarios',
        userDocRef.id,
        `Usuario creado: ${userBaseData.nombre || userBaseData.cedula}`,
        { cedula: userBaseData.cedula, nombre: userBaseData.nombre }
    )

    console.log('Usuario creado en colección usuarios. Cédula:', userBaseData.cedula)
    return { created: true, id: userDocRef.id }
}

export const getAllUsers = async () => {
    const usersCollection = collection(db, 'usuarios')
    const usersQuery = query(usersCollection, orderBy('nombre', 'asc'))
    const snapshot = await getDocs(usersQuery)

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))
}

export const getUserByEmail = async (email) => {
    if (!email) return null
    const normalized = normalizeEmail(email)
    const usersCollection = collection(db, 'usuarios')
    const q = query(usersCollection, where('email', '==', normalized))
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) return null
    const d = querySnapshot.docs[0]
    return { id: d.id, ...d.data() }
}

/** Cuando el correo en Auth no coincide con el guardado en Firestore, localizar por UID de Firebase Auth. */
export const getUserByAuthUid = async (authUid) => {
    if (!authUid) return null
    const usersCollection = collection(db, 'usuarios')
    const q = query(usersCollection, where('authUid', '==', authUid))
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) return null
    const d = querySnapshot.docs[0]
    return { id: d.id, ...d.data() }
}

export const getUsersByRol = async (rol) => {
    const usersCollection = collection(db, 'usuarios')
    const q = query(usersCollection, where('rol', '==', rol))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
    }))
}

export const setUserRol = async (cedula, rol) => {
    if (!cedula || (rol !== 'admin' && rol !== 'operador')) {
        throw new Error('Cédula y rol válidos son requeridos.')
    }
    const userDocRef = doc(db, 'usuarios', cedula)
    await setDoc(
        userDocRef,
        {
            rol,
            updatedAt: new Date()
        },
        { merge: true }
    )
    await logAction(
        'actualizar',
        'usuarios',
        cedula,
        `Rol actualizado a ${rol}`,
        { cedula, rol }
    )
}

export const getUserByCedula = async (cedula) => {
    if (!cedula) {
        throw new Error('Se requiere la cédula para consultar el usuario.')
    }

    const userDocRef = doc(db, 'usuarios', cedula)
    const snapshot = await getDoc(userDocRef)

    if (!snapshot.exists()) {
        const usersCollection = collection(db, 'usuarios')
        const alternativeQuery = query(usersCollection, where('cedula', '==', cedula))
        const querySnapshot = await getDocs(alternativeQuery)

        if (querySnapshot.empty) {
            return null
        }

        const docMatch = querySnapshot.docs[0]
        return {
            id: docMatch.id,
            ...docMatch.data()
        }
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    }
}

export const updateUserPoints = async (cedula, points) => {
    if (!cedula) {
        throw new Error('Se requiere la cédula para actualizar los puntos.')
    }

    const userDocRef = doc(db, 'usuarios', cedula)
    const now = new Date()

    await setDoc(userDocRef, {
        puntos: Number.isFinite(points) ? points : 0,
        rankingUpdatedAt: now,
        updatedAt: now
    }, { merge: true })

    // Registrar log
    await logAction(
        'actualizar',
        'usuarios',
        userDocRef.id,
        `Puntos actualizados para usuario: ${cedula} (${points} puntos)`,
        { cedula, puntos: points }
    )

    return { cedula, puntos: Number.isFinite(points) ? points : 0 }
}

export const incrementUserPoints = async (cedula, delta) => {
    if (!cedula) {
        throw new Error('Se requiere la cédula para ajustar los puntos.')
    }

    if (!Number.isFinite(delta) || delta === 0) {
        return { cedula, delta: 0 }
    }

    const userDocRef = doc(db, 'usuarios', cedula)
    const now = new Date()

    await setDoc(userDocRef, {
        puntos: increment(delta),
        rankingUpdatedAt: now,
        updatedAt: now
    }, { merge: true })

    // Registrar log
    await logAction(
        'actualizar',
        'usuarios',
        userDocRef.id,
        `Puntos incrementados para usuario: ${cedula} (${delta > 0 ? '+' : ''}${delta} puntos)`,
        { cedula, delta }
    )

    return { cedula, delta }
}

