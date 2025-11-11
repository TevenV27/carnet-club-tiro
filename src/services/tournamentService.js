import { db } from '../firebase/config'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    Timestamp,
    updateDoc
} from 'firebase/firestore'

const tournamentsCollection = collection(db, 'torneos')

const normalizeTournament = (docSnap) => {
    if (!docSnap.exists()) {
        return null
    }

    const data = docSnap.data()

    const estadoDoc = data.estado || 'activo'

    const normalized = {
        id: docSnap.id,
        nombre: data.nombre || 'Torneo sin nombre',
        fechaInicio: data.fechaInicio,
        estado: estadoDoc,
        participantes: data.participantes || [],
        actividades: data.actividades || [],
        galeria: data.galeria || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
    }

    if (estadoDoc === 'cancelado' || estadoDoc === 'finalizado') {
        return normalized
    }

    normalized.estado = determineEstado(normalized.fechaInicio)
    return normalized
}

const determineEstado = (fechaInicio) => {
    if (!fechaInicio) {
        return 'activo'
    }

    const now = new Date()
    const startDate = fechaInicio instanceof Date ? fechaInicio : fechaInicio.toDate?.() ?? new Date(fechaInicio)

    if (startDate < now) {
        return 'finalizado'
    }

    return 'activo'
}

export const getTournaments = async () => {
    const snapshot = await getDocs(tournamentsCollection)
    const tournaments = snapshot.docs
        .map((docSnap) => normalizeTournament(docSnap))
        .filter(Boolean)
        .sort((a, b) => {
            const dateA = a.fechaInicio?.toDate?.() ?? new Date(a.fechaInicio || 0)
            const dateB = b.fechaInicio?.toDate?.() ?? new Date(b.fechaInicio || 0)
            return dateA - dateB
        })

    return tournaments
}

export const createTournament = async ({ nombre, fechaInicio, participantes }) => {
    if (!nombre || !fechaInicio) {
        throw new Error('Nombre y fecha de inicio son obligatorios para crear un torneo.')
    }

    const fecha = typeof fechaInicio === 'string'
        ? Timestamp.fromDate(new Date(fechaInicio))
        : Timestamp.fromDate(fechaInicio)

    const now = new Date()
    const participantesData = participantes.map((participante) => ({
        cedula: participante.cedula,
        nombre: participante.nombre,
        foto: participante.foto ?? null,
        rankingAppliedScore: participante.rankingAppliedScore ?? 0,
        activityScores: participante.activityScores ?? {}
    }))

    const docRef = await addDoc(tournamentsCollection, {
        nombre,
        fechaInicio: fecha,
        estado: determineEstado(fecha.toDate()),
        participantes: participantesData,
        actividades: [],
        galeria: [],
        createdAt: now,
        updatedAt: now
    })

    const snapshot = await getDoc(docRef)
    return normalizeTournament(snapshot)
}

export const getTournamentById = async (id) => {
    if (!id) {
        throw new Error('Se requiere el ID del torneo.')
    }

    const docRef = doc(db, 'torneos', id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
        return null
    }

    return normalizeTournament(snapshot)
}

export const addActivityToTournament = async (tournamentId, activity) => {
    if (!tournamentId || !activity?.nombre) {
        throw new Error('Se requiere el ID del torneo y el nombre de la actividad.')
    }

    const docRef = doc(db, 'torneos', tournamentId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
        throw new Error('El torneo no existe.')
    }

    const tournament = snapshot.data()
    const activities = tournament.actividades || []
    const newActivity = {
        id: activity.id || `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        nombre: activity.nombre,
        descripcion: activity.descripcion || '',
        puntajeMaximo: typeof activity.puntajeMaximo === 'number' ? activity.puntajeMaximo : null
    }

    activities.push(newActivity)

    await updateDoc(docRef, {
        actividades: activities,
        updatedAt: new Date()
    })

    const updatedSnapshot = await getDoc(docRef)
    return normalizeTournament(updatedSnapshot)
}

export const updateTournamentParticipantScores = async (tournamentId, participantUpdates) => {
    if (!tournamentId) {
        throw new Error('Se requiere el ID del torneo para actualizar puntuaciones.')
    }

    const docRef = doc(db, 'torneos', tournamentId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
        throw new Error('El torneo no existe.')
    }

    const tournament = snapshot.data()
    const participantes = tournament.participantes || []

    const updatedParticipants = participantes.map((participant) => {
        const update = participantUpdates[participant.cedula]
        if (!update) {
            return participant
        }

        return {
            ...participant,
            activityScores: update.activityScores,
            rankingAppliedScore: update.newAppliedScore,
            foto: participant.foto ?? null
        }
    })

    await updateDoc(docRef, {
        participantes: updatedParticipants,
        updatedAt: new Date()
    })

    const updatedSnapshot = await getDoc(docRef)
    return normalizeTournament(updatedSnapshot)
}

export const updateTournamentInfo = async (tournamentId, { nombre, fechaInicio, participantes }) => {
    if (!tournamentId) {
        throw new Error('Se requiere el ID del torneo para actualizarlo.')
    }

    const docRef = doc(db, 'torneos', tournamentId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
        throw new Error('El torneo no existe.')
    }

    const updates = { updatedAt: new Date() }

    if (nombre) {
        updates.nombre = nombre
    }

    if (fechaInicio) {
        const fecha = typeof fechaInicio === 'string'
            ? Timestamp.fromDate(new Date(fechaInicio))
            : Timestamp.fromDate(fechaInicio)
        updates.fechaInicio = fecha
        updates.estado = determineEstado(fecha.toDate())
    }

    if (Array.isArray(participantes)) {
        updates.participantes = participantes.map((participante) => ({
            cedula: participante.cedula,
            nombre: participante.nombre,
            foto: participante.foto ?? null,
            rankingAppliedScore: participante.rankingAppliedScore ?? 0,
            activityScores: participante.activityScores ?? {}
        }))
    }

    await updateDoc(docRef, updates)
    const updatedSnapshot = await getDoc(docRef)
    return normalizeTournament(updatedSnapshot)
}

export const addTournamentEvidence = async (tournamentId, images) => {
    if (!tournamentId) {
        throw new Error('Se requiere el ID del torneo para adjuntar evidencias.')
    }

    if (!Array.isArray(images) || images.length === 0) {
        return null
    }

    const docRef = doc(db, 'torneos', tournamentId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
        throw new Error('El torneo no existe.')
    }

    const tournament = snapshot.data()
    const galeria = tournament.galeria || []
    const now = new Date()

    const newEntries = images.map((src) => ({
        id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        src,
        uploadedAt: now
    }))

    await updateDoc(docRef, {
        galeria: [...galeria, ...newEntries],
        updatedAt: now
    })

    const updatedSnapshot = await getDoc(docRef)
    return normalizeTournament(updatedSnapshot)
}

export const cancelTournament = async (tournamentId) => {
    if (!tournamentId) {
        throw new Error('Se requiere el ID del torneo para cancelarlo.')
    }

    const docRef = doc(db, 'torneos', tournamentId)
    await updateDoc(docRef, {
        estado: 'cancelado',
        updatedAt: new Date()
    })

    const updatedSnapshot = await getDoc(docRef)
    return normalizeTournament(updatedSnapshot)
}

export const deleteTournament = async (tournamentId) => {
    if (!tournamentId) {
        throw new Error('Se requiere el ID del torneo para eliminarlo.')
    }

    await deleteDoc(doc(db, 'torneos', tournamentId))
}

export const finalizeTournament = async (tournamentId) => {
    if (!tournamentId) {
        throw new Error('Se requiere el ID del torneo para finalizarlo.')
    }

    const docRef = doc(db, 'torneos', tournamentId)
    await updateDoc(docRef, {
        estado: 'finalizado',
        updatedAt: new Date()
    })

    const updatedSnapshot = await getDoc(docRef)
    return normalizeTournament(updatedSnapshot)
}

