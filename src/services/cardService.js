import { db } from '../firebase/config'
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    setDoc
} from 'firebase/firestore'
import { upsertUserRecord } from './userService'
import {
    createOperatorFirebaseUser,
    updateOperatorFirebaseEmail,
    recreateOperatorAuthAfterDeletion,
    noOperatorAuthAccountsForEmails
} from './operatorAuthService'
import { logAction } from './logService'

// Comprimir imagen Blob a base64 con calidad reducida
const compressImage = (blob, maxWidth = 1200, quality = 0.75) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(blob)

        img.onload = () => {
            URL.revokeObjectURL(url)

            // Calcular nuevas dimensiones manteniendo el aspect ratio
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
                height = (height * maxWidth) / width
                width = maxWidth
            }

            // Crear canvas para comprimir
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)

            // Convertir a base64 con calidad reducida
            canvas.toBlob((compressedBlob) => {
                if (!compressedBlob) {
                    reject(new Error('Error al comprimir la imagen'))
                    return
                }

                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(compressedBlob)
            }, 'image/jpeg', quality)
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Error al cargar la imagen'))
        }

        img.src = url
    })
}

// Convertir Blob a base64 (sin compresión para fotos pequeñas)
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

// Guardar carnet en Firestore (sin usar Storage, guardando imágenes como base64)
export const saveCard = async (cardData, frontCardBlob, backCardBlob, userId) => {
    try {
        // Verificar que userId existe
        if (!userId) {
            throw new Error('Usuario no autenticado. userId es requerido.')
        }

        console.log('Guardando carnet para usuario:', userId)
        // Comprimir y convertir imágenes a base64 con compresión más agresiva
        // Empezar con calidad más baja y tamaño más pequeño para evitar exceder el límite de 1MB
        let frontCardBase64 = await compressImage(frontCardBlob, 800, 0.5)
        let backCardBase64 = await compressImage(backCardBlob, 800, 0.5)

        // Verificar tamaño de las imágenes comprimidas y reducir progresivamente si es necesario
        let frontSize = frontCardBase64.length
        let backSize = backCardBase64.length
        let maxWidth = 800
        let quality = 0.5

        // Reducir progresivamente hasta que ambas imágenes sean menores a 400KB cada una
        while ((frontSize > 400000 || backSize > 400000) && quality > 0.2) {
            console.warn(`Imágenes muy grandes (${Math.round(frontSize/1024)}KB, ${Math.round(backSize/1024)}KB), reduciendo calidad...`)
            quality -= 0.1
            maxWidth -= 50
            
            if (frontSize > 400000) {
                frontCardBase64 = await compressImage(frontCardBlob, maxWidth, quality)
                frontSize = frontCardBase64.length
            }
            if (backSize > 400000) {
                backCardBase64 = await compressImage(backCardBlob, maxWidth, quality)
                backSize = backCardBase64.length
            }
        }

        // Convertir foto a base64 si existe (es un objeto File)
        let fotoBase64 = null
        if (cardData.foto && cardData.foto instanceof File) {
            // Comprimir la foto con mayor compresión
            fotoBase64 = await compressImage(cardData.foto, 600, 0.6)
        } else if (typeof cardData.foto === 'string') {
            // Si ya es base64, mantenerlo
            fotoBase64 = cardData.foto
        }

        // Crear objeto de datos sin el objeto File original
        const { foto, ...restCardData } = cardData

        // Guardar datos en Firestore con imágenes como base64
        const cardDoc = {
            ...restCardData,
            foto: fotoBase64, // Guardar foto como base64
            frontCardBase64, // Guardar como base64 comprimido
            backCardBase64,  // Guardar como base64 comprimido
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        // Verificar tamaño total del documento antes de guardar
        const docSize = JSON.stringify(cardDoc).length
        console.log(`Tamaño del documento: ${Math.round(docSize/1024)}KB`)
        
        if (docSize > 1000000) { // 1MB = 1,000,000 bytes (con margen de seguridad)
            console.warn('Documento aún muy grande, aplicando compresión adicional...')
            // Reducir aún más la calidad
            frontCardBase64 = await compressImage(frontCardBlob, 700, 0.4)
            backCardBase64 = await compressImage(backCardBlob, 700, 0.4)
            if (fotoBase64 && cardData.foto instanceof File) {
                fotoBase64 = await compressImage(cardData.foto, 500, 0.5)
            }
            
            cardDoc.frontCardBase64 = frontCardBase64
            cardDoc.backCardBase64 = backCardBase64
            cardDoc.foto = fotoBase64
            
            const newDocSize = JSON.stringify(cardDoc).length
            console.log(`Nuevo tamaño del documento: ${Math.round(newDocSize/1024)}KB`)
        }

        console.log('Intentando guardar documento en Firestore...')
        console.log('Colección: carnets')
        console.log('Usuario ID:', userId)
        console.log('Cédula:', cardData.cedula)

        const tipoCarnet = cardData.tipoCarnet === 'traumatico' ? 'traumatico' : 'airsoft'
        cardDoc.tipoCarnet = tipoCarnet
        if (tipoCarnet === 'traumatico') {
            cardDoc.disciplina = cardData.disciplina || 'BAJA LETALIDAD'
            cardDoc.tipo = cardData.tipo || 'TRAUMÁTICA'
        } else if (!cardDoc.disciplina) {
            cardDoc.disciplina = 'AIRSOFT'
        }

        // Verificar si ya existe un carnet del mismo tipo con esta cédula
        const q = query(collection(db, 'carnets'), where('cedula', '==', cardData.cedula))
        const querySnapshot = await getDocs(q)
        const existingSameTipo = querySnapshot.docs.find((d) => {
            const t = d.data()?.tipoCarnet
            if (tipoCarnet === 'traumatico') return t === 'traumatico'
            // airsoft: docs sin tipo (legado) o explícitos
            return !t || t === 'airsoft'
        })

        const usuarioRef = doc(db, 'usuarios', cardData.cedula)
        const usuarioAntes = await getDoc(usuarioRef)
        const yaTieneAuth =
            usuarioAntes.exists() && Boolean(usuarioAntes.data()?.authUid)

        const emailNorm = String(cardData.email ?? '')
            .trim()
            .toLowerCase()
        const emailValido = emailNorm.includes('@')
        const userEmailNorm = usuarioAntes.exists() && usuarioAntes.data()?.email
            ? String(usuarioAntes.data().email).trim().toLowerCase()
            : ''
        const carnetEmailNorm = existingSameTipo?.data()?.email
            ? String(existingSameTipo.data().email).trim().toLowerCase()
            : ''
        // Mismo orden que CreateCard al cargar: email del carnet, si no el de usuarios
        const priorEmailNorm = carnetEmailNorm || userEmailNorm
        const emailChanged =
            emailValido && Boolean(priorEmailNorm) && emailNorm !== priorEmailNorm

        if (yaTieneAuth && emailChanged) {
            const authUid = usuarioAntes.data()?.authUid
            const oldCandidates = [carnetEmailNorm, userEmailNorm].filter(Boolean)
            const authEmailRes = await updateOperatorFirebaseEmail({
                oldEmailCandidates: oldCandidates,
                newEmail: emailNorm,
                cedula: String(cardData.cedula).trim(),
                expectedAuthUid: authUid
            })
            if (!authEmailRes.ok) {
                const canRecreate =
                    authEmailRes.onlyUserNotFound ||
                    (await noOperatorAuthAccountsForEmails(oldCandidates, emailNorm))
                if (canRecreate) {
                    const rec = await recreateOperatorAuthAfterDeletion({
                        newEmail: emailNorm,
                        cedula: String(cardData.cedula).trim()
                    })
                    if (rec.ok && rec.uid) {
                        await setDoc(
                            usuarioRef,
                            { authUid: rec.uid, updatedAt: new Date() },
                            { merge: true }
                        )
                    } else {
                        throw new Error(
                            rec.friendlyMessage ||
                                authEmailRes.friendlyMessage ||
                                authEmailRes.error ||
                                'No se pudo sincronizar el correo con Authentication.'
                        )
                    }
                } else {
                    throw new Error(
                        authEmailRes.friendlyMessage ||
                            authEmailRes.error ||
                            'No se pudo actualizar el correo en Authentication.'
                    )
                }
            }
        }

        let docRef
        let resultDoc
        let cardId
        const baseUserData = {
            ...restCardData,
            tipoCarnet,
            disciplina: cardDoc.disciplina,
            ...(tipoCarnet === 'traumatico' ? { tipo: cardDoc.tipo } : {})
        }

        if (existingSameTipo) {
            // Si ya existe del mismo tipo, actualizar
            const existingDoc = existingSameTipo
            docRef = doc(db, 'carnets', existingDoc.id)

            const existingData = existingDoc.data()
            const incomingNum = String(cardData.numeroMembresia ?? '').trim()
            // No pisar el estado activo/inactivo al regenerar el carnet
            const { activo: _incomingActivo, ...cardDocWithoutActivo } = cardDoc
            const updatedDoc = {
                ...cardDocWithoutActivo,
                createdAt: existingData.createdAt || new Date(),
                updatedAt: new Date(),
                activo: existingData.activo !== false,
                numeroMembresia: incomingNum || existingData.numeroMembresia || cardDoc.numeroMembresia
            }

            await updateDoc(docRef, updatedDoc)
            
            await logAction(
                'actualizar',
                'carnets',
                existingDoc.id,
                `Carnet ${tipoCarnet} actualizado: ${cardData.numeroMembresia || cardData.cedula}`,
                { cedula: cardData.cedula, numeroMembresia: cardData.numeroMembresia, tipoCarnet }
            )
            
            console.log('Carnet actualizado exitosamente. ID:', existingDoc.id, '(ya existía con esta cédula)')
            resultDoc = updatedDoc
            cardId = existingDoc.id
        } else {
            console.log('No se encontró carnet existente del mismo tipo, creando nuevo...')
            console.log('Datos a guardar (sin imágenes):', {
                ...restCardData,
                tipoCarnet,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                frontCardBase64: `[Base64 string de ${frontCardBase64.length} caracteres]`,
                backCardBase64: `[Base64 string de ${backCardBase64.length} caracteres]`,
                foto: fotoBase64 ? `[Base64 string de ${fotoBase64.length} caracteres]` : null
            })

            const newCardDoc = { ...cardDoc, activo: true }
            docRef = await addDoc(collection(db, 'carnets'), newCardDoc)
            
            await logAction(
                'crear',
                'carnets',
                docRef.id,
                `Carnet ${tipoCarnet} creado: ${cardData.numeroMembresia || cardData.cedula}`,
                { cedula: cardData.cedula, numeroMembresia: cardData.numeroMembresia, tipoCarnet }
            )
            
            console.log('Documento creado exitosamente con ID:', docRef.id, '(nuevo carnet)')
            resultDoc = newCardDoc
            cardId = docRef.id
        }

        const userSyncResult = await upsertUserRecord({
            userBaseData: baseUserData,
            fotoBase64,
            userId,
            carnetId: cardId
        })

        /** Antes solo se creaba Auth si el doc usuarios era nuevo; muchos casos ya tenían doc sin authUid. */
        let authCreation = null
        if (emailValido && !yaTieneAuth) {
            try {
                const authRes = await createOperatorFirebaseUser(
                    emailNorm,
                    String(cardData.cedula).trim()
                )
                if (authRes.uid) {
                    await setDoc(
                        usuarioRef,
                        { authUid: authRes.uid, updatedAt: new Date() },
                        { merge: true }
                    )
                    authCreation = { ok: true, uid: authRes.uid }
                } else if (authRes.skipped) {
                    authCreation = { ok: false, reason: authRes.reason || 'skipped' }
                    console.warn(
                        'Auth: no se creó cuenta (email posiblemente ya en uso).',
                        authRes
                    )
                }
            } catch (authErr) {
                console.error('No se pudo crear la cuenta de acceso del operador:', authErr)
                authCreation = {
                    ok: false,
                    error: authErr?.message || String(authErr),
                    code: authErr?.code
                }
            }
        }

        return {
            id: cardId,
            ...resultDoc,
            _wasUpdated: Boolean(existingSameTipo),
            _userRecordCreated: userSyncResult?.created ?? null,
            _authCreation: authCreation,
            _authSkippedAlreadyLinked: yaTieneAuth,
            _authSkippedNoEmail: !emailValido
        }
    } catch (error) {
        console.error('Error guardando carnet:', error)
        throw error
    }
}

// Buscar carnet por cédula (opcionalmente filtrado por tipo)
export const searchCardByCedula = async (cedula, tipoCarnet = null) => {
    const cards = await searchCardsByCedula(cedula)
    if (!cards.length) return null

    if (tipoCarnet === 'traumatico') {
        return cards.find((c) => c.tipoCarnet === 'traumatico') || null
    }
    if (tipoCarnet === 'airsoft') {
        return cards.find((c) => !c.tipoCarnet || c.tipoCarnet === 'airsoft') || null
    }
    return cards[0]
}

/** Todos los carnets de una cédula (prueba string y número por datos legacy). */
export const searchCardsByCedula = async (cedula) => {
    try {
        if (cedula === null || cedula === undefined || cedula === '') {
            return []
        }

        const raw = String(cedula).trim()
        const variants = [raw]
        if (/^\d+$/.test(raw)) {
            const asNum = Number(raw)
            if (!Number.isNaN(asNum)) variants.push(asNum)
        }

        const byId = new Map()
        for (const value of variants) {
            const q = query(collection(db, 'carnets'), where('cedula', '==', value))
            const querySnapshot = await getDocs(q)
            querySnapshot.forEach((docSnap) => {
                byId.set(docSnap.id, { id: docSnap.id, ...docSnap.data() })
            })
        }

        return Array.from(byId.values())
    } catch (error) {
        console.error('Error buscando carnets:', error)
        throw error
    }
}

// Obtener todos los carnets de un usuario
export const getUserCards = async (userId) => {
    try {
        const q = query(collection(db, 'carnets'), where('userId', '==', userId))
        const querySnapshot = await getDocs(q)

        const cards = []
        querySnapshot.forEach((doc) => {
            cards.push({ id: doc.id, ...doc.data() })
        })

        return cards
    } catch (error) {
        console.error('Error obteniendo carnets:', error)
        throw error
    }
}

/** Todos los documentos de la colección `carnets`. `tipoCarnet`: 'airsoft' | 'traumatico' | null (todos). */
export const getAllCarnets = async (tipoCarnet = null) => {
    try {
        const snapshot = await getDocs(collection(db, 'carnets'))
        const cards = []
        snapshot.forEach((d) => {
            const data = d.data()
            const t = data.tipoCarnet
            if (tipoCarnet === 'traumatico') {
                if (t !== 'traumatico') return
            } else if (tipoCarnet === 'airsoft') {
                if (t && t !== 'airsoft') return
            }
            cards.push({ id: d.id, ...data })
        })
        return cards
    } catch (error) {
        console.error('Error obteniendo todos los carnets:', error)
        throw error
    }
}

// Generar el siguiente número de membresía airsoft (CTV-1001, CTV-1002, …)
export const getNextMembershipNumber = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'carnets'))
        
        let maxNumber = 1000
        
        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data()
            if (data.tipoCarnet === 'traumatico') return
            const numeroMembresia = data.numeroMembresia || ''
            // Solo CTV-XXXX (no CTV-T…)
            const match = String(numeroMembresia).match(/^CTV-(\d+)$/i)
            if (match) {
                const number = parseInt(match[1], 10)
                if (!isNaN(number) && number >= 1001 && number <= 9999 && number > maxNumber) {
                    maxNumber = number
                }
            }
        })
        
        const nextNumber = maxNumber + 1
        
        if (nextNumber > 9999) {
            console.warn('Se alcanzó el límite máximo de números de membresía (9999)')
            return 'CTV-9999'
        }
        
        return `CTV-${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
        console.error('Error generando número de membresía:', error)
        return 'CTV-1001'
    }
}

// Generar el siguiente número traumático (CTV-T1001, CTV-T1002, …)
export const getNextTraumaticoMembershipNumber = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'carnets'))

        let maxNumber = 1000

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data()
            const numeroMembresia = data.numeroMembresia || ''
            const match = String(numeroMembresia).match(/^CTV-T(\d+)$/i)
            if (match) {
                const number = parseInt(match[1], 10)
                if (!isNaN(number) && number >= 1001 && number <= 9999 && number > maxNumber) {
                    maxNumber = number
                }
            }
        })

        const nextNumber = maxNumber + 1

        if (nextNumber > 9999) {
            console.warn('Se alcanzó el límite máximo de números traumáticos (9999)')
            return 'CTV-T9999'
        }

        return `CTV-T${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
        console.error('Error generando número de membresía traumático:', error)
        return 'CTV-T1001'
    }
}

/** Activa o desactiva un carnet por ID (`activo: false` = inactivo). */
export const setCarnetActivo = async (cardId, activo) => {
    if (!cardId) {
        throw new Error('Se requiere el ID del carnet.')
    }
    const next = Boolean(activo)
    const cardRef = doc(db, 'carnets', cardId)
    // setDoc merge: más fiable que updateDoc si el doc existe
    await setDoc(
        cardRef,
        {
            activo: next,
            updatedAt: new Date()
        },
        { merge: true }
    )
    await logAction(
        'actualizar',
        'carnets',
        cardId,
        `Carnet ${next ? 'activado' : 'desactivado'}: ${cardId}`,
        { cardId, activo: next }
    )
    return { id: cardId, activo: next }
}
