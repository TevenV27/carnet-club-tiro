import { db } from '../firebase/config'
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc
} from 'firebase/firestore'
import { upsertUserRecord } from './userService'

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
        // Comprimir y convertir imágenes a base64 (calidad 0.75 y ancho máximo 1200px para reducir tamaño)
        let frontCardBase64 = await compressImage(frontCardBlob, 1200, 0.75)
        let backCardBase64 = await compressImage(backCardBlob, 1200, 0.75)

        // Verificar tamaño de las imágenes comprimidas (Firestore tiene límite de ~1MB por campo)
        const frontSize = frontCardBase64.length
        const backSize = backCardBase64.length

        if (frontSize > 900000 || backSize > 900000) {
            console.warn('Imagen muy grande después de compresión, reduciendo calidad...')
            // Intentar con menor calidad si aún es muy grande
            if (frontSize > 900000) {
                frontCardBase64 = await compressImage(frontCardBlob, 1000, 0.6)
            }
            if (backSize > 900000) {
                backCardBase64 = await compressImage(backCardBlob, 1000, 0.6)
            }
        }

        // Convertir foto a base64 si existe (es un objeto File)
        let fotoBase64 = null
        if (cardData.foto && cardData.foto instanceof File) {
            // Comprimir la foto también si es grande
            if (cardData.foto.size > 500000) {
                fotoBase64 = await compressImage(cardData.foto, 800, 0.7)
            } else {
                fotoBase64 = await blobToBase64(cardData.foto)
            }
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

        console.log('Intentando guardar documento en Firestore...')
        console.log('Colección: carnets')
        console.log('Usuario ID:', userId)
        console.log('Cédula:', cardData.cedula)

        // Verificar si ya existe un carnet con esta cédula
        const q = query(collection(db, 'carnets'), where('cedula', '==', cardData.cedula))
        const querySnapshot = await getDocs(q)

        let docRef
        let resultDoc
        let cardId
        const baseUserData = {
            ...restCardData
        }

        if (!querySnapshot.empty) {
            // Si ya existe, actualizar el documento existente
            const existingDoc = querySnapshot.docs[0]
            docRef = doc(db, 'carnets', existingDoc.id)

            // Mantener el createdAt original y actualizar updatedAt
            const existingData = existingDoc.data()
            const updatedDoc = {
                ...cardDoc,
                createdAt: existingData.createdAt || new Date(), // Mantener la fecha original
                updatedAt: new Date() // Actualizar la fecha de modificación
            }

            await updateDoc(docRef, updatedDoc)
            console.log('Carnet actualizado exitosamente. ID:', existingDoc.id, '(ya existía con esta cédula)')
            resultDoc = updatedDoc
            cardId = existingDoc.id
        } else {
            // Si no existe, crear un nuevo documento
            console.log('No se encontró carnet existente, creando nuevo...')
            console.log('Datos a guardar (sin imágenes):', {
                ...restCardData,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
                frontCardBase64: `[Base64 string de ${frontCardBase64.length} caracteres]`,
                backCardBase64: `[Base64 string de ${backCardBase64.length} caracteres]`,
                foto: fotoBase64 ? `[Base64 string de ${fotoBase64.length} caracteres]` : null
            })

            docRef = await addDoc(collection(db, 'carnets'), cardDoc)
            console.log('Documento creado exitosamente con ID:', docRef.id, '(nuevo carnet)')
            resultDoc = cardDoc
            cardId = docRef.id
        }

        const userSyncResult = await upsertUserRecord({
            userBaseData: baseUserData,
            fotoBase64,
            userId,
            carnetId: cardId
        })

        return {
            id: cardId,
            ...resultDoc,
            _wasUpdated: !querySnapshot.empty,
            _userRecordCreated: userSyncResult?.created ?? null
        }
    } catch (error) {
        console.error('Error guardando carnet:', error)
        throw error
    }
}

// Buscar carnet por cédula
export const searchCardByCedula = async (cedula) => {
    try {
        const q = query(collection(db, 'carnets'), where('cedula', '==', cedula))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            return null
        }

        const doc = querySnapshot.docs[0]
        return { id: doc.id, ...doc.data() }
    } catch (error) {
        console.error('Error buscando carnet:', error)
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
