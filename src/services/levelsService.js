import { db } from '../firebase/config'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc
} from 'firebase/firestore'
import { logAction } from './logService'

const levelsCollection = collection(db, 'niveles')

export const getLevels = async () => {
    const snapshot = await getDocs(levelsCollection)

    const levelsWithMeta = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data()
        const rawCreatedAt = data.createdAt
        const createdAt =
            (rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
                ? rawCreatedAt.toDate()
                : rawCreatedAt) || null

        return {
            id: docSnap.id,
            nombre: data.nombre || `Nivel ${index + 1}`,
            descripcion: data.descripcion || '',
            orden: data.orden ?? index + 1,
            _createdAt: createdAt
        }
    })

    // Ordenar por fecha de creación (más viejo primero)
    levelsWithMeta.sort((a, b) => {
        const timeA = a._createdAt instanceof Date ? a._createdAt.getTime() : 0
        const timeB = b._createdAt instanceof Date ? b._createdAt.getTime() : 0
        return timeA - timeB
    })

    // Devolver sin el campo interno _createdAt
    return levelsWithMeta.map(({ _createdAt, ...rest }) => rest)
}

export const createLevel = async ({ nombre, descripcion }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del nivel es obligatorio.')
    }

    const now = new Date()

    const docRef = await addDoc(levelsCollection, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        createdAt: now,
        updatedAt: now
    })

    // Registrar log
    await logAction(
        'crear',
        'niveles',
        docRef.id,
        `Nivel creado: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )

    return { id: docRef.id }
}

export const updateLevel = async (id, { nombre, descripcion }) => {
    if (!id) {
        throw new Error('Se requiere el ID del nivel para actualizarlo.')
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del nivel es obligatorio.')
    }

    const levelRef = doc(db, 'niveles', id)
    await updateDoc(levelRef, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        updatedAt: new Date()
    })

    // Registrar log
    await logAction(
        'actualizar',
        'niveles',
        id,
        `Nivel actualizado: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )
}

export const deleteLevel = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del nivel para eliminarlo.')
    }

    const levelRef = doc(db, 'niveles', id)

    // Obtener datos antes de eliminar para el log
    const levelSnap = await getDoc(levelRef)
    let nombreEliminado = 'Nivel'
    if (levelSnap.exists()) {
        const data = levelSnap.data()
        nombreEliminado = data.nombre || 'Nivel'
    }

    await deleteDoc(levelRef)

    // Registrar log
    await logAction(
        'eliminar',
        'niveles',
        id,
        `Nivel eliminado: ${nombreEliminado}`,
        { nombre: nombreEliminado }
    )
}


