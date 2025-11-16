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

export const upsertUserRecord = async ({ userBaseData, fotoBase64, userId, carnetId }) => {
    if (!userBaseData?.cedula) {
        console.warn('No se puede crear/actualizar el usuario sin un número de cédula válido.')
        return null
    }

    const userDocRef = doc(db, 'usuarios', userBaseData.cedula)
    const now = new Date()
    const payload = {
        ...userBaseData,
        foto: fotoBase64 ?? null,
        userId,
        carnetId,
        carnetUpdatedAt: now,
        updatedAt: now
    }

    const existingUserSnapshot = await getDoc(userDocRef)

    if (existingUserSnapshot.exists()) {
        const existingData = existingUserSnapshot.data()

        await setDoc(userDocRef, {
            ...payload,
            createdAt: existingData.createdAt || now
        }, { merge: true })

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

    await setDoc(userDocRef, {
        ...payload,
        createdAt: now
    })

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

