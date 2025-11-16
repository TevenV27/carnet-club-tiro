import { db } from '../firebase/config'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc
} from 'firebase/firestore'
import { logAction } from './logService'

const vigenciasCollection = collection(db, 'vigencias')

export const getVigencias = async () => {
    const snapshot = await getDocs(vigenciasCollection)

    const vigenciasWithMeta = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data()
        const rawCreatedAt = data.createdAt
        const createdAt =
            (rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
                ? rawCreatedAt.toDate()
                : rawCreatedAt) || null

        return {
            id: docSnap.id,
            nombre: data.nombre || `Vigencia ${index + 1}`,
            descripcion: data.descripcion || '',
            _createdAt: createdAt
        }
    })

    // Ordenar por fecha de creación (más viejo primero)
    vigenciasWithMeta.sort((a, b) => {
        const timeA = a._createdAt instanceof Date ? a._createdAt.getTime() : 0
        const timeB = b._createdAt instanceof Date ? b._createdAt.getTime() : 0
        return timeA - timeB
    })

    return vigenciasWithMeta.map(({ _createdAt, ...rest }) => rest)
}

export const createVigencia = async ({ nombre, descripcion }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la vigencia es obligatorio.')
    }

    const now = new Date()

    const docRef = await addDoc(vigenciasCollection, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        createdAt: now,
        updatedAt: now
    })

    // Registrar log
    await logAction(
        'crear',
        'vigencias',
        docRef.id,
        `Vigencia creada: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )

    return { id: docRef.id }
}

export const updateVigencia = async (id, { nombre, descripcion }) => {
    if (!id) {
        throw new Error('Se requiere el ID de la vigencia para actualizarla.')
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la vigencia es obligatorio.')
    }

    const vigenciaRef = doc(db, 'vigencias', id)
    await updateDoc(vigenciaRef, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        updatedAt: new Date()
    })

    // Registrar log
    await logAction(
        'actualizar',
        'vigencias',
        id,
        `Vigencia actualizada: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )
}

export const deleteVigencia = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID de la vigencia para eliminarla.')
    }

    const vigenciaRef = doc(db, 'vigencias', id)
    
    // Obtener datos antes de eliminar para el log
    const vigenciaSnap = await getDoc(vigenciaRef)
    let nombreEliminado = 'Vigencia'
    if (vigenciaSnap.exists()) {
        const data = vigenciaSnap.data()
        nombreEliminado = data.nombre || 'Vigencia'
    }
    
    await deleteDoc(vigenciaRef)

    // Registrar log
    await logAction(
        'eliminar',
        'vigencias',
        id,
        `Vigencia eliminada: ${nombreEliminado}`,
        { nombre: nombreEliminado }
    )
}

