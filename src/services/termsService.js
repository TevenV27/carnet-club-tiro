import { db } from '../firebase/config'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc
} from 'firebase/firestore'

// Colección: vigencias de vinculación al club (ej: 1 año, 2 años)
const termsCollection = collection(db, 'vigencias')

export const getTerms = async () => {
    const snapshot = await getDocs(termsCollection)

    const termsWithMeta = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data()
        const rawCreatedAt = data.createdAt
        const createdAt =
            (rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
                ? rawCreatedAt.toDate()
                : rawCreatedAt) || null

        return {
            id: docSnap.id,
            nombre: data.nombre || `Vigencia ${index + 1}`,
            // Por ejemplo: 1, 2 (años) o texto libre si lo necesitas
            duracion: data.duracion ?? '',
            unidad: data.unidad || 'años',
            _createdAt: createdAt
        }
    })

    // Ordenar por fecha de creación (más viejo primero)
    termsWithMeta.sort((a, b) => {
        const timeA = a._createdAt instanceof Date ? a._createdAt.getTime() : 0
        const timeB = b._createdAt instanceof Date ? b._createdAt.getTime() : 0
        return timeA - timeB
    })

    return termsWithMeta.map(({ _createdAt, ...rest }) => rest)
}

export const createTerm = async ({ nombre, duracion, unidad }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la vigencia es obligatorio.')
    }

    if (duracion === undefined || duracion === null || `${duracion}`.trim() === '') {
        throw new Error('La duración de la vigencia es obligatoria.')
    }

    const now = new Date()

    const docRef = await addDoc(termsCollection, {
        nombre: nombre.trim(),
        duracion: Number.isFinite(Number(duracion)) ? Number(duracion) : `${duracion}`.trim(),
        unidad: unidad?.trim() || 'años',
        createdAt: now,
        updatedAt: now
    })

    return { id: docRef.id }
}

export const updateTerm = async (id, { nombre, duracion, unidad }) => {
    if (!id) {
        throw new Error('Se requiere el ID de la vigencia para actualizarla.')
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la vigencia es obligatorio.')
    }

    if (duracion === undefined || duracion === null || `${duracion}`.trim() === '') {
        throw new Error('La duración de la vigencia es obligatoria.')
    }

    const termRef = doc(db, 'vigencias', id)
    await updateDoc(termRef, {
        nombre: nombre.trim(),
        duracion: Number.isFinite(Number(duracion)) ? Number(duracion) : `${duracion}`.trim(),
        unidad: unidad?.trim() || 'años',
        updatedAt: new Date()
    })
}

export const deleteTerm = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID de la vigencia para eliminarla.')
    }

    const termRef = doc(db, 'vigencias', id)
    await deleteDoc(termRef)
}


