import { db } from '../firebase/config'
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    Timestamp,
    updateDoc
} from 'firebase/firestore'

const teamsCollection = collection(db, 'equipos')

const normalizeTeamDoc = (docSnap) => {
    if (!docSnap.exists()) {
        return null
    }

    const data = docSnap.data()

    return {
        id: docSnap.id,
        nombre: data.nombre || 'Equipo sin nombre',
        departamento: data.departamento || '',
        ciudad: data.ciudad || '',
        logo: data.logo || null,
        capitanCedula: data.capitanCedula || '',
        capitanNombre: data.capitanNombre || '',
        capitanContacto: data.capitanContacto || '',
        miembros: data.miembros || [],
        createdAt: data.createdAt
    }
}

export const getTeams = async () => {
    const snapshot = await getDocs(teamsCollection)
    return snapshot.docs
        .map(normalizeTeamDoc)
        .filter(Boolean)
        .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0
            return (a.createdAt.toDate?.() ?? new Date(0)) - (b.createdAt.toDate?.() ?? new Date(0))
        })
}

export const getTeamById = async (teamId) => {
    if (!teamId) {
        throw new Error('Se requiere el ID del equipo.')
    }

    const docRef = doc(db, 'equipos', teamId)
    const snapshot = await getDoc(docRef)

    return normalizeTeamDoc(snapshot)
}

export const createTeam = async ({ nombre, departamento, ciudad, logoBase64, capitan, miembros }) => {
    if (!nombre?.trim()) {
        throw new Error('El nombre del equipo es obligatorio.')
    }
    if (!capitan?.cedula) {
        throw new Error('Debes seleccionar el capitán del equipo.')
    }

    const now = new Date()

    const docRef = await addDoc(teamsCollection, {
        nombre: nombre.trim(),
        departamento: departamento?.trim() || '',
        ciudad: ciudad?.trim() || '',
        logo: logoBase64 || null,
        capitanCedula: capitan.cedula,
        capitanNombre: capitan.nombre || '',
        capitanContacto: capitan.contacto || '',
        miembros: miembros || [],
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
    })

    return normalizeTeamDoc(await getDoc(docRef))
}

export const updateTeamMembers = async (teamId, miembros) => {
    if (!teamId) {
        throw new Error('Se requiere el ID del equipo para actualizar los miembros.')
    }

    const docRef = doc(db, 'equipos', teamId)
    await updateDoc(docRef, {
        miembros: miembros || [],
        updatedAt: Timestamp.fromDate(new Date())
    })

    const snapshot = await getDoc(docRef)
    return normalizeTeamDoc(snapshot)
}

export const updateTeamInfo = async (teamId, { nombre, departamento, ciudad, logoBase64, capitan }) => {
    if (!teamId) {
        throw new Error('Se requiere el ID del equipo para actualizarlo.')
    }

    const docRef = doc(db, 'equipos', teamId)

    const payload = {
        updatedAt: Timestamp.fromDate(new Date())
    }

    if (typeof nombre === 'string') {
        payload.nombre = nombre.trim()
    }

    if (typeof departamento === 'string') {
        payload.departamento = departamento.trim()
    }

    if (typeof ciudad === 'string') {
        payload.ciudad = ciudad.trim()
    }

    if (logoBase64 !== undefined) {
        payload.logo = logoBase64 || null
    }

    if (capitan) {
        payload.capitanCedula = capitan.cedula
        payload.capitanNombre = capitan.nombre || ''
        payload.capitanContacto = capitan.contacto || ''
    }

    await updateDoc(docRef, payload)

    const snapshot = await getDoc(docRef)
    return normalizeTeamDoc(snapshot)
}

