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

const specialtiesCollection = collection(db, 'especialidades')

export const getSpecialties = async () => {
    const snapshot = await getDocs(specialtiesCollection)

    const specialtiesWithMeta = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data()
        const rawCreatedAt = data.createdAt
        const createdAt =
            (rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
                ? rawCreatedAt.toDate()
                : rawCreatedAt) || null

        return {
            id: docSnap.id,
            nombre: data.nombre || `Especialidad ${index + 1}`,
            descripcion: data.descripcion || '',
            _createdAt: createdAt
        }
    })

    // Ordenar por fecha de creación (más viejo primero)
    specialtiesWithMeta.sort((a, b) => {
        const timeA = a._createdAt instanceof Date ? a._createdAt.getTime() : 0
        const timeB = b._createdAt instanceof Date ? b._createdAt.getTime() : 0
        return timeA - timeB
    })

    return specialtiesWithMeta.map(({ _createdAt, ...rest }) => rest)
}

export const createSpecialty = async ({ nombre, descripcion }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la especialidad es obligatorio.')
    }

    const now = new Date()

    const docRef = await addDoc(specialtiesCollection, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        createdAt: now,
        updatedAt: now
    })

    // Registrar log
    await logAction(
        'crear',
        'especialidades',
        docRef.id,
        `Especialidad creada: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )

    return { id: docRef.id }
}

export const updateSpecialty = async (id, { nombre, descripcion }) => {
    if (!id) {
        throw new Error('Se requiere el ID de la especialidad para actualizarla.')
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la especialidad es obligatorio.')
    }

    const specialtyRef = doc(db, 'especialidades', id)
    await updateDoc(specialtyRef, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        updatedAt: new Date()
    })

    // Registrar log
    await logAction(
        'actualizar',
        'especialidades',
        id,
        `Especialidad actualizada: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )
}

export const deleteSpecialty = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID de la especialidad para eliminarla.')
    }

    const specialtyRef = doc(db, 'especialidades', id)
    
    // Obtener datos antes de eliminar para el log
    const specialtySnap = await getDoc(specialtyRef)
    let nombreEliminado = 'Especialidad'
    if (specialtySnap.exists()) {
        const data = specialtySnap.data()
        nombreEliminado = data.nombre || 'Especialidad'
    }
    
    await deleteDoc(specialtyRef)

    // Registrar log
    await logAction(
        'eliminar',
        'especialidades',
        id,
        `Especialidad eliminada: ${nombreEliminado}`,
        { nombre: nombreEliminado }
    )
}


