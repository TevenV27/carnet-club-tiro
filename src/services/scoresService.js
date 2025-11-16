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

const scoresCollection = collection(db, 'puntajes')

export const getScores = async () => {
    const snapshot = await getDocs(scoresCollection)

    const scoresWithMeta = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data()
        const rawCreatedAt = data.createdAt
        const createdAt =
            (rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
                ? rawCreatedAt.toDate()
                : rawCreatedAt) || null

        return {
            id: docSnap.id,
            nombre: data.nombre || `Puntaje ${index + 1}`,
            valor: data.valor ?? '',
            _createdAt: createdAt
        }
    })

    // Ordenar por fecha de creación (más viejo primero)
    scoresWithMeta.sort((a, b) => {
        const timeA = a._createdAt instanceof Date ? a._createdAt.getTime() : 0
        const timeB = b._createdAt instanceof Date ? b._createdAt.getTime() : 0
        return timeA - timeB
    })

    return scoresWithMeta.map(({ _createdAt, ...rest }) => rest)
}

export const createScore = async ({ nombre, valor }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del puntaje es obligatorio.')
    }

    if (valor === undefined || valor === null || `${valor}`.trim() === '') {
        throw new Error('El valor del puntaje es obligatorio.')
    }

    const now = new Date()

    const docRef = await addDoc(scoresCollection, {
        nombre: nombre.trim(),
        // Guardamos valor como número si es posible, si no como texto
        valor: Number.isFinite(Number(valor)) ? Number(valor) : `${valor}`.trim(),
        createdAt: now,
        updatedAt: now
    })

    // Registrar log
    await logAction(
        'crear',
        'puntajes',
        docRef.id,
        `Puntaje creado: ${nombre.trim()} (${valor})`,
        { nombre: nombre.trim(), valor }
    )

    return { id: docRef.id }
}

export const updateScore = async (id, { nombre, valor }) => {
    if (!id) {
        throw new Error('Se requiere el ID del puntaje para actualizarlo.')
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del puntaje es obligatorio.')
    }

    if (valor === undefined || valor === null || `${valor}`.trim() === '') {
        throw new Error('El valor del puntaje es obligatorio.')
    }

    const scoreRef = doc(db, 'puntajes', id)
    await updateDoc(scoreRef, {
        nombre: nombre.trim(),
        valor: Number.isFinite(Number(valor)) ? Number(valor) : `${valor}`.trim(),
        updatedAt: new Date()
    })

    // Registrar log
    await logAction(
        'actualizar',
        'puntajes',
        id,
        `Puntaje actualizado: ${nombre.trim()} (${valor})`,
        { nombre: nombre.trim(), valor }
    )
}

export const deleteScore = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del puntaje para eliminarlo.')
    }

    const scoreRef = doc(db, 'puntajes', id)

    // Obtener datos antes de eliminar para el log
    const scoreSnap = await getDoc(scoreRef)
    let nombreEliminado = 'Puntaje'
    if (scoreSnap.exists()) {
        const data = scoreSnap.data()
        nombreEliminado = data.nombre || 'Puntaje'
    }

    await deleteDoc(scoreRef)

    // Registrar log
    await logAction(
        'eliminar',
        'puntajes',
        id,
        `Puntaje eliminado: ${nombreEliminado}`,
        { nombre: nombreEliminado }
    )
}


