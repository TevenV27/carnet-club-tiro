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
            
            // Registrar log
            await logAction(
                'actualizar',
                'carnets',
                existingDoc.id,
                `Carnet actualizado: ${cardData.numeroMembresia || cardData.cedula}`,
                { cedula: cardData.cedula, numeroMembresia: cardData.numeroMembresia }
            )
            
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
            
            // Registrar log
            await logAction(
                'crear',
                'carnets',
                docRef.id,
                `Carnet creado: ${cardData.numeroMembresia || cardData.cedula}`,
                { cedula: cardData.cedula, numeroMembresia: cardData.numeroMembresia }
            )
            
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

// Generar el siguiente número de membresía automáticamente (CTV-1001, CTV-1002, etc.)
export const getNextMembershipNumber = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'carnets'))
        
        let maxNumber = 1000 // Empezamos en 1000 para que el primer número sea CTV-1001
        
        snapshot.docs.forEach((doc) => {
            const data = doc.data()
            const numeroMembresia = data.numeroMembresia || ''
            
            // Extraer el número del formato CTV-XXXX
            const match = numeroMembresia.match(/CTV-(\d+)/i)
            if (match) {
                const number = parseInt(match[1], 10)
                // Solo considerar números válidos entre 1001 y 9999
                // Ignorar números fuera de este rango (posibles errores o datos antiguos)
                if (!isNaN(number) && number >= 1001 && number <= 9999 && number > maxNumber) {
                    maxNumber = number
                }
            }
        })
        
        // El siguiente número será maxNumber + 1
        // Si no se encontró ningún número válido, maxNumber seguirá siendo 1000, y el siguiente será 1001
        const nextNumber = maxNumber + 1
        
        // Asegurar que el número no exceda 9999
        if (nextNumber > 9999) {
            console.warn('Se alcanzó el límite máximo de números de membresía (9999)')
            return 'CTV-9999'
        }
        
        return `CTV-${nextNumber.toString().padStart(4, '0')}`
    } catch (error) {
        console.error('Error generando número de membresía:', error)
        // Si hay error, retornar el primer número por defecto
        return 'CTV-1001'
    }
}
