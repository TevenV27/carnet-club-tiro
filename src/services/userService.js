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
    const tipoCarnet = userBaseData.tipoCarnet === 'traumatico' ? 'traumatico' : 'airsoft'
    const incomingNum = String(userBaseData.numeroMembresia ?? '').trim()

    const existingUserSnapshot = await getDoc(userDocRef)

    if (existingUserSnapshot.exists()) {
        const existingData = existingUserSnapshot.data()
        const rol = existingData.rol ?? userBaseData.rol ?? 'operador'

        if (tipoCarnet === 'traumatico') {
            // Misma cédula ya tiene perfil (p. ej. airsoft): no pisar foto, marca, armas, etc.
            await setDoc(
                userDocRef,
                omitUndefined({
                    numeroMembresiaTraumatico:
                        incomingNum || existingData.numeroMembresiaTraumatico,
                    carnetIdTraumatico: carnetId || existingData.carnetIdTraumatico,
                    carnetTraumaticoUpdatedAt: now,
                    updatedAt: now,
                    rol,
                    // Solo sincronizar correo si viene en el formulario (Auth)
                    ...(emailNorm ? { email: emailNorm } : {}),
                    ...(authUid ? { authUid } : {})
                }),
                { merge: true }
            )

            await logAction(
                'actualizar',
                'usuarios',
                userDocRef.id,
                `Vínculo carnet traumático: ${userBaseData.cedula}`,
                { cedula: userBaseData.cedula, numeroMembresiaTraumatico: incomingNum }
            )

            console.log(
                'Usuario existente: solo se vinculó carnet traumático. Cédula:',
                userBaseData.cedula
            )
            return { created: false, id: userDocRef.id, traumaticoLinkOnly: true }
        }

        // Airsoft: actualizar perfil operativo sin tocar datos traumáticos
        const {
            marca: _marca,
            calibre: _calibre,
            an: _an,
            tipo: _tipo,
            tipoCarnet: _tipoCarnet,
            arma: _arma,
            numeroMembresiaTraumatico: _nmt,
            carnetIdTraumatico: _cit,
            ...airsoftFields
        } = userBaseData

        await setDoc(
            userDocRef,
            omitUndefined({
                ...airsoftFields,
                email: emailNorm ?? userBaseData.email ?? null,
                foto: fotoBase64 ?? null,
                userId,
                carnetId,
                carnetUpdatedAt: now,
                updatedAt: now,
                rol,
                createdAt: existingData.createdAt || now,
                numeroMembresia: incomingNum || existingData.numeroMembresia,
                numeroMembresiaTraumatico: existingData.numeroMembresiaTraumatico,
                carnetIdTraumatico: existingData.carnetIdTraumatico,
                ...(authUid ? { authUid } : {})
            }),
            { merge: true }
        )

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

    // Usuario nuevo
    if (tipoCarnet === 'traumatico') {
        await setDoc(
            userDocRef,
            omitUndefined({
                cedula: userBaseData.cedula,
                nombre: userBaseData.nombre ?? null,
                email: emailNorm ?? userBaseData.email ?? null,
                contacto: userBaseData.contacto ?? null,
                contactoEmergencia: userBaseData.contactoEmergencia ?? null,
                rh: userBaseData.rh ?? null,
                vigencia: userBaseData.vigencia ?? null,
                foto: fotoBase64 ?? null,
                userId,
                carnetIdTraumatico: carnetId,
                numeroMembresia: incomingNum || null,
                numeroMembresiaTraumatico: incomingNum || null,
                disciplina: userBaseData.disciplina || 'BAJA LETALIDAD',
                tipo: userBaseData.tipo || 'TRAUMÁTICA',
                tipoCarnet: 'traumatico',
                rol: 'operador',
                activo: true,
                createdAt: now,
                updatedAt: now,
                carnetTraumaticoUpdatedAt: now,
                ...(authUid ? { authUid } : {})
            })
        )
    } else {
        await setDoc(
            userDocRef,
            omitUndefined({
                ...userBaseData,
                email: emailNorm ?? userBaseData.email ?? null,
                foto: fotoBase64 ?? null,
                userId,
                carnetId,
                carnetUpdatedAt: now,
                updatedAt: now,
                rol: 'operador',
                activo: true,
                createdAt: now,
                ...(authUid ? { authUid } : {})
            })
        )
    }

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

/** Activa o desactiva el operador completo (`activo: false` = inactivo). */
export const setUserActivo = async (cedula, activo) => {
    if (!cedula) {
        throw new Error('Se requiere la cédula para actualizar el estado del operador.')
    }
    const next = Boolean(activo)
    const userDocRef = doc(db, 'usuarios', cedula)
    await setDoc(
        userDocRef,
        {
            activo: next,
            updatedAt: new Date()
        },
        { merge: true }
    )

    // Al desactivar el operador, marcar también sus carnets (consultas públicas leen `carnets`)
    if (!next) {
        const cardsSnap = await getDocs(
            query(collection(db, 'carnets'), where('cedula', '==', cedula))
        )
        const now = new Date()
        await Promise.all(
            cardsSnap.docs.map((cardSnap) =>
                setDoc(
                    cardSnap.ref,
                    { activo: false, updatedAt: now },
                    { merge: true }
                )
            )
        )
    }

    await logAction(
        'actualizar',
        'usuarios',
        cedula,
        `Operador ${next ? 'activado' : 'desactivado'}: ${cedula}`,
        { cedula, activo: next, carnetsDesactivados: !next }
    )
    return { cedula, activo: next }
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

export const updateUserPoints = async (cedula, points, tipo = 'airsoft') => {
    if (!cedula) {
        throw new Error('Se requiere la cédula para actualizar los puntos.')
    }

    const userDocRef = doc(db, 'usuarios', cedula)
    const now = new Date()
    const field = tipo === 'traumatico' ? 'puntosTraumatico' : 'puntos'
    const value = Number.isFinite(points) ? points : 0

    await setDoc(userDocRef, {
        [field]: value,
        rankingUpdatedAt: now,
        updatedAt: now
    }, { merge: true })

    await logAction(
        'actualizar',
        'usuarios',
        userDocRef.id,
        `Puntos ${tipo} actualizados para usuario: ${cedula} (${value} puntos)`,
        { cedula, [field]: value, tipo }
    )

    return { cedula, [field]: value, tipo }
}

export const incrementUserPoints = async (cedula, delta, tipo = 'airsoft') => {
    if (!cedula) {
        throw new Error('Se requiere la cédula para ajustar los puntos.')
    }

    if (!Number.isFinite(delta) || delta === 0) {
        return { cedula, delta: 0 }
    }

    const userDocRef = doc(db, 'usuarios', cedula)
    const now = new Date()
    const field = tipo === 'traumatico' ? 'puntosTraumatico' : 'puntos'

    await setDoc(userDocRef, {
        [field]: increment(delta),
        rankingUpdatedAt: now,
        updatedAt: now
    }, { merge: true })

    await logAction(
        'actualizar',
        'usuarios',
        userDocRef.id,
        `Puntos ${tipo} incrementados para usuario: ${cedula} (${delta > 0 ? '+' : ''}${delta} puntos)`,
        { cedula, delta, tipo }
    )

    return { cedula, delta, tipo }
}

/** Usuario con carnet traumático vinculado (CTV-T / carnetIdTraumatico). */
export const userHasTraumaticoCarnet = (user) => {
    if (!user) return false
    if (user.carnetIdTraumatico) return true
    if (user.numeroMembresiaTraumatico) return true
    if (/^CTV-T\d+/i.test(String(user.numeroMembresia || ''))) return true
    return false
}

