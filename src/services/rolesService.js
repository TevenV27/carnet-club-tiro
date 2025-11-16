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

const rolesCollection = collection(db, 'roles')

export const getRoles = async () => {
    const snapshot = await getDocs(rolesCollection)

    const rolesWithMeta = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data()
        const rawCreatedAt = data.createdAt
        const createdAt =
            (rawCreatedAt && typeof rawCreatedAt.toDate === 'function'
                ? rawCreatedAt.toDate()
                : rawCreatedAt) || null

        return {
            id: docSnap.id,
            nombre: data.nombre || `Rol ${index + 1}`,
            descripcion: data.descripcion || '',
            _createdAt: createdAt
        }
    })

    // Ordenar por fecha de creación (más viejo primero)
    rolesWithMeta.sort((a, b) => {
        const timeA = a._createdAt instanceof Date ? a._createdAt.getTime() : 0
        const timeB = b._createdAt instanceof Date ? b._createdAt.getTime() : 0
        return timeA - timeB
    })

    return rolesWithMeta.map(({ _createdAt, ...rest }) => rest)
}

export const createRole = async ({ nombre, descripcion }) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del rol es obligatorio.')
    }

    const now = new Date()

    const docRef = await addDoc(rolesCollection, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        createdAt: now,
        updatedAt: now
    })

    // Registrar log
    await logAction(
        'crear',
        'roles',
        docRef.id,
        `Rol creado: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )

    return { id: docRef.id }
}

export const updateRole = async (id, { nombre, descripcion }) => {
    if (!id) {
        throw new Error('Se requiere el ID del rol para actualizarlo.')
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre del rol es obligatorio.')
    }

    const roleRef = doc(db, 'roles', id)
    await updateDoc(roleRef, {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        updatedAt: new Date()
    })

    // Registrar log
    await logAction(
        'actualizar',
        'roles',
        id,
        `Rol actualizado: ${nombre.trim()}`,
        { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' }
    )
}

export const deleteRole = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del rol para eliminarlo.')
    }

    const roleRef = doc(db, 'roles', id)

    // Obtener datos antes de eliminar para el log
    const roleSnap = await getDoc(roleRef)
    let nombreEliminado = 'Rol'
    if (roleSnap.exists()) {
        const data = roleSnap.data()
        nombreEliminado = data.nombre || 'Rol'
    }

    await deleteDoc(roleRef)

    // Registrar log
    await logAction(
        'eliminar',
        'roles',
        id,
        `Rol eliminado: ${nombreEliminado}`,
        { nombre: nombreEliminado }
    )
}


