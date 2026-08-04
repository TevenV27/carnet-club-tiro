import { db, auth } from '../firebase/config'
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore'
import { logAction } from './logService'

/**
 * Se guarda en "equipos" con _modulo porque las reglas
 * de Firestore del proyecto permiten esa colección.
 */
const ASISTENCIA_MODULO = 'asistencia'
const PARAM_MODULO = 'asistencia_parametro'
const asistenciasCollection = collection(db, 'equipos')

export const METODOS_PAGO = ['Efectivo', 'Transferencia']
export const ESTADOS_PAGO = ['pagado', 'pendiente']
/** Franjas de inicio: 6:00 a. m. – 11:00 p. m. (fin máximo 12:00 a. m.) */
export const HORAS_CALENDARIO = Array.from({ length: 18 }, (_, i) => i + 6) // 6..23
/** Fin de jornada (medianoche) */
export const HORA_FIN_MAX = 24

/** Días JS: 0=Domingo … 6=Sábado */
export const DIAS_SEMANA_OPTIONS = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
]

const HORIZON_DAYS = 370

const createRowId = () =>
    `row_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export { createRowId }

const toDateKeyFromDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const parseDateKeyToDate = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number)
    return new Date(y, m - 1, d)
}

const todayDateKey = () => toDateKeyFromDate(new Date())

const addDaysToKey = (dateKey, days) => {
    const d = parseDateKeyToDate(dateKey)
    d.setDate(d.getDate() + days)
    return toDateKeyFromDate(d)
}

const matchingDateKeys = (startKey, endKey, diasSemana) => {
    const days = Array.isArray(diasSemana) ? diasSemana.map(Number) : []
    const keys = []
    let cursor = parseDateKeyToDate(startKey)
    const end = parseDateKeyToDate(endKey)
    while (cursor <= end) {
        if (days.includes(cursor.getDay())) {
            keys.push(toDateKeyFromDate(cursor))
        }
        cursor.setDate(cursor.getDate() + 1)
    }
    return keys
}

const clampHour = (hour, fallback = 6) => {
    const n = Number(hour)
    if (!Number.isFinite(n)) return fallback
    if (n < 6) return 6
    if (n > 23) return 23
    return Math.floor(n)
}

const clampHoraFin = (hour, horaInicio = 6) => {
    const start = clampHour(horaInicio)
    const n = Number(hour)
    if (!Number.isFinite(n)) return Math.min(HORA_FIN_MAX, start + 1)
    return Math.min(HORA_FIN_MAX, Math.max(start + 1, Math.floor(n)))
}

const formatHourLabel = (hour) => {
    const h = Number(hour)
    if (h === 24 || h === 0) return '12:00 a. m.'
    if (h === 12) return '12:00 p. m.'
    if (h > 12) return `${String(h - 12).padStart(2, '0')}:00 p. m.`
    return `${String(h).padStart(2, '0')}:00 a. m.`
}

export const formatHoraCorta = (hour) => {
    const h = Number(hour)
    if (h === 24) return '00:00'
    return `${String(clampHour(h, h)).padStart(2, '0')}:00`
}

export { formatHourLabel, clampHour, clampHoraFin }

const normalizeRegistro = (registro = {}) => ({
    id: registro.id || createRowId(),
    nombre: registro.nombre || '',
    telefono: registro.telefono || '',
    metodoPago: METODOS_PAGO.includes(registro.metodoPago) ? registro.metodoPago : '',
    estadoPago: ESTADOS_PAGO.includes(registro.estadoPago) ? registro.estadoPago : '',
    notas: registro.notas || ''
})

const normalizeAsistenciaDoc = (docSnap) => {
    if (!docSnap.exists()) return null

    const data = docSnap.data()
    if (data._modulo !== ASISTENCIA_MODULO) return null
    if (data.eliminado) return null

    const horaInicio = clampHour(data.horaInicio ?? 6)
    const horaFin = clampHoraFin(
        data.horaFin != null ? data.horaFin : horaInicio + 1,
        horaInicio
    )

    return {
        id: docSnap.id,
        titulo: data.titulo || 'Asistencia',
        dateKey: data.dateKey || '',
        horaInicio,
        horaFin,
        parametroId: data.parametroId || null,
        registros: Array.isArray(data.registros) ? data.registros.map(normalizeRegistro) : [],
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    }
}

const sortAsistencias = (list) =>
    [...list].sort((a, b) => {
        if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1
        if (a.horaInicio !== b.horaInicio) return a.horaInicio - b.horaInicio
        return (a.titulo || '').localeCompare(b.titulo || '')
    })

export const getAsistencias = async () => {
    const snapshot = await getDocs(
        query(asistenciasCollection, where('_modulo', '==', ASISTENCIA_MODULO))
    )
    return sortAsistencias(snapshot.docs.map(normalizeAsistenciaDoc).filter(Boolean))
}

export const getAsistenciasByRange = async (startKey, endKey) => {
    if (!startKey || !endKey) {
        throw new Error('Se requiere el rango de fechas.')
    }

    const snapshot = await getDocs(
        query(asistenciasCollection, where('_modulo', '==', ASISTENCIA_MODULO))
    )

    return sortAsistencias(
        snapshot.docs
            .map(normalizeAsistenciaDoc)
            .filter(Boolean)
            .filter((item) => item.dateKey >= startKey && item.dateKey <= endKey)
    )
}

export const getAsistenciasByMonth = async (year, month) => {
    const monthStr = String(month).padStart(2, '0')
    return getAsistenciasByRange(`${year}-${monthStr}-01`, `${year}-${monthStr}-31`)
}

export const getAsistenciaById = async (asistenciaId) => {
    if (!asistenciaId) {
        throw new Error('Se requiere el ID de la asistencia.')
    }

    const docRef = doc(db, 'equipos', asistenciaId)
    const snapshot = await getDoc(docRef)
    return normalizeAsistenciaDoc(snapshot)
}

export const createAsistencia = async ({
    titulo,
    dateKey,
    horaInicio,
    horaFin,
    registros = [],
    parametroId = null,
    silent = false
}) => {
    if (!dateKey) {
        throw new Error('La fecha es obligatoria.')
    }

    if (!auth.currentUser) {
        throw new Error(
            'No hay sesión activa en Firebase. Cierra sesión y vuelve a iniciar sesión.'
        )
    }

    const start = clampHour(horaInicio, 6)
    const end = clampHoraFin(horaFin, start)
    const tituloFinal =
        titulo?.trim() || `Asistencia ${dateKey} ${formatHoraCorta(start)}`
    const now = new Date()
    const registrosNormalizados = Array.isArray(registros)
        ? registros.map(normalizeRegistro)
        : []

    const payload = {
        _modulo: ASISTENCIA_MODULO,
        nombre: `[Asistencia] ${tituloFinal}`,
        titulo: tituloFinal,
        dateKey,
        horaInicio: start,
        horaFin: end,
        registros: registrosNormalizados,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        createdBy: auth.currentUser.uid,
        createdByEmail: auth.currentUser.email || null
    }

    if (parametroId) {
        payload.parametroId = parametroId
    }

    const docRef = await addDoc(asistenciasCollection, payload)

    if (!silent) {
        await logAction(
            'crear',
            'asistencias',
            docRef.id,
            `Asistencia creada: ${tituloFinal}`,
            { dateKey, titulo: tituloFinal, horaInicio: start, horaFin: end }
        )
    }

    return normalizeAsistenciaDoc(await getDoc(docRef))
}

export const updateAsistencia = async (asistenciaId, { titulo, registros, horaInicio, horaFin }) => {
    if (!asistenciaId) {
        throw new Error('Se requiere el ID de la asistencia.')
    }

    const docRef = doc(db, 'equipos', asistenciaId)
    const snapshot = await getDoc(docRef)
    const current = snapshot.exists() ? snapshot.data() : null

    if (!current || current._modulo !== ASISTENCIA_MODULO) {
        throw new Error('No se encontró el evento de asistencia.')
    }

    const payload = {
        _modulo: ASISTENCIA_MODULO,
        updatedAt: Timestamp.fromDate(new Date())
    }

    if (typeof titulo === 'string') {
        const tituloFinal = titulo.trim() || current?.titulo || 'Asistencia'
        payload.titulo = tituloFinal
        payload.nombre = `[Asistencia] ${tituloFinal}`
    }

    if (horaInicio != null) {
        payload.horaInicio = clampHour(horaInicio, current?.horaInicio ?? 6)
    }

    if (horaFin != null || horaInicio != null) {
        const start = payload.horaInicio ?? clampHour(current?.horaInicio, 6)
        payload.horaFin = clampHoraFin(
            horaFin != null ? horaFin : current?.horaFin ?? start + 1,
            start
        )
    }

    if (Array.isArray(registros)) {
        payload.registros = registros.map(normalizeRegistro)
    }

    await updateDoc(docRef, payload)

    await logAction(
        'actualizar',
        'asistencias',
        asistenciaId,
        `Asistencia actualizada: ${payload.titulo || current?.titulo || asistenciaId}`,
        {
            titulo: payload.titulo || current?.titulo,
            registrosCount: Array.isArray(registros) ? registros.length : current?.registros?.length || 0
        }
    )

    return normalizeAsistenciaDoc(await getDoc(docRef))
}

export const deleteAsistencia = async (asistenciaId) => {
    if (!asistenciaId) {
        throw new Error('Se requiere el ID de la asistencia.')
    }

    const docRef = doc(db, 'equipos', asistenciaId)
    const snapshot = await getDoc(docRef)
    const data = snapshot.exists() ? snapshot.data() : null

    if (!data || data._modulo !== ASISTENCIA_MODULO) {
        throw new Error('No se encontró el evento de asistencia.')
    }

    // Soft-delete: en este proyecto las reglas suelen bloquear deleteDoc
    await updateDoc(docRef, {
        eliminado: true,
        updatedAt: Timestamp.fromDate(new Date())
    })

    await logAction(
        'eliminar',
        'asistencias',
        asistenciaId,
        `Asistencia eliminada: ${data?.titulo || asistenciaId}`,
        { dateKey: data?.dateKey, titulo: data?.titulo }
    )
}

const normalizeParametroDoc = (docSnap) => {
    if (!docSnap.exists()) return null
    const data = docSnap.data()
    if (data._modulo !== PARAM_MODULO) return null
    if (data.eliminado) return null

    const horaInicio = clampHour(data.horaInicio ?? 6)
    return {
        id: docSnap.id,
        titulo: data.titulo || 'Evento parametrizado',
        diasSemana: Array.isArray(data.diasSemana) ? data.diasSemana.map(Number) : [],
        horaInicio,
        horaFin: clampHoraFin(data.horaFin ?? horaInicio + 1, horaInicio),
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    }
}

export const getParametrosAsistencia = async () => {
    const snapshot = await getDocs(
        query(asistenciasCollection, where('_modulo', '==', PARAM_MODULO))
    )
    return snapshot.docs
        .map(normalizeParametroDoc)
        .filter(Boolean)
        .sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''))
}

const commitBatches = async (buildOps) => {
    const CHUNK = 400
    let batch = writeBatch(db)
    let ops = 0

    const flush = async () => {
        if (ops === 0) return
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
    }

    for (const apply of buildOps) {
        apply(batch)
        ops += 1
        if (ops >= CHUNK) await flush()
    }
    await flush()
}

const generateEventsForParametro = async (parametro, fromKey, toKey, existingEvents = null) => {
    const startKey = fromKey > todayDateKey() ? fromKey : todayDateKey()
    const dateKeys = matchingDateKeys(startKey, toKey, parametro.diasSemana)
    if (dateKeys.length === 0) return 0

    let existingKeys
    if (Array.isArray(existingEvents)) {
        existingKeys = new Set(
            existingEvents
                .filter((e) => e.parametroId === parametro.id)
                .map((e) => e.dateKey)
        )
    } else {
        const existing = await getDocs(
            query(asistenciasCollection, where('_modulo', '==', ASISTENCIA_MODULO))
        )
        existingKeys = new Set(
            existing.docs
                .map((d) => d.data())
                .filter((d) => !d.eliminado && d.parametroId === parametro.id)
                .map((d) => d.dateKey)
        )
    }

    const missing = dateKeys.filter((dateKey) => !existingKeys.has(dateKey))
    if (missing.length === 0) return 0

    const now = new Date()
    const uid = auth.currentUser?.uid || null
    const email = auth.currentUser?.email || null

    await commitBatches(
        missing.map((dateKey) => (batch) => {
            const ref = doc(asistenciasCollection)
            batch.set(ref, {
                _modulo: ASISTENCIA_MODULO,
                nombre: `[Asistencia] ${parametro.titulo}`,
                titulo: parametro.titulo,
                dateKey,
                horaInicio: parametro.horaInicio,
                horaFin: parametro.horaFin,
                parametroId: parametro.id,
                registros: [],
                createdAt: Timestamp.fromDate(now),
                updatedAt: Timestamp.fromDate(now),
                createdBy: uid,
                createdByEmail: email
            })
        })
    )

    return missing.length
}

/** Crea eventos faltantes del rango visible (hoy en adelante). */
export const ensureParametrizedEventsForRange = async (startKey, endKey) => {
    const parametros = await getParametrosAsistencia()
    if (parametros.length === 0) return

    const fromKey = startKey < todayDateKey() ? todayDateKey() : startKey
    if (fromKey > endKey) return

    const existing = await getAsistenciasByRange(startKey, endKey)

    await Promise.all(
        parametros.map((parametro) =>
            generateEventsForParametro(parametro, fromKey, endKey, existing)
        )
    )
}

export const createParametroAsistencia = async ({ titulo, diasSemana, horaInicio, horaFin }) => {
    if (!titulo?.trim()) {
        throw new Error('El título es obligatorio.')
    }
    if (!Array.isArray(diasSemana) || diasSemana.length === 0) {
        throw new Error('Selecciona al menos un día de la semana.')
    }
    if (!auth.currentUser) {
        throw new Error('No hay sesión activa en Firebase.')
    }

    const start = clampHour(horaInicio, 6)
    const end = clampHoraFin(horaFin, start)
    const tituloFinal = titulo.trim()
    const now = new Date()

    const docRef = await addDoc(asistenciasCollection, {
        _modulo: PARAM_MODULO,
        nombre: `[Parametro] ${tituloFinal}`,
        titulo: tituloFinal,
        diasSemana: diasSemana.map(Number),
        horaInicio: start,
        horaFin: end,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        createdBy: auth.currentUser.uid
    })

    const parametro = normalizeParametroDoc(await getDoc(docRef))

    await logAction(
        'crear',
        'asistencia_parametros',
        docRef.id,
        `Parámetro de asistencia creado: ${tituloFinal}`,
        { diasSemana, horaInicio: start, horaFin: end }
    )

    // Generar instancias en lote desde hoy (~1 año)
    const toKey = addDaysToKey(todayDateKey(), HORIZON_DAYS)
    await generateEventsForParametro(parametro, todayDateKey(), toKey)

    return parametro
}

/**
 * Actualiza un parámetro y regenera eventos desde hoy en adelante.
 * Los eventos anteriores a hoy se conservan sin cambios.
 */
export const updateParametroAsistencia = async (
    parametroId,
    { titulo, diasSemana, horaInicio, horaFin }
) => {
    if (!parametroId) {
        throw new Error('Se requiere el ID del parámetro.')
    }
    if (!titulo?.trim()) {
        throw new Error('El título es obligatorio.')
    }
    if (!Array.isArray(diasSemana) || diasSemana.length === 0) {
        throw new Error('Selecciona al menos un día de la semana.')
    }
    if (!auth.currentUser) {
        throw new Error('No hay sesión activa en Firebase.')
    }

    const paramRef = doc(db, 'equipos', parametroId)
    const paramSnap = await getDoc(paramRef)
    if (!paramSnap.exists() || paramSnap.data()._modulo !== PARAM_MODULO || paramSnap.data().eliminado) {
        throw new Error('No se encontró el evento parametrizado.')
    }

    const start = clampHour(horaInicio, 6)
    const end = clampHoraFin(horaFin, start)
    const tituloFinal = titulo.trim()
    const now = Timestamp.fromDate(new Date())
    const cutoff = todayDateKey()

    await updateDoc(paramRef, {
        nombre: `[Parametro] ${tituloFinal}`,
        titulo: tituloFinal,
        diasSemana: diasSemana.map(Number),
        horaInicio: start,
        horaFin: end,
        updatedAt: now
    })

    const eventsSnap = await getDocs(
        query(asistenciasCollection, where('_modulo', '==', ASISTENCIA_MODULO))
    )

    const futureRefs = eventsSnap.docs
        .filter((d) => {
            const data = d.data()
            return (
                !data.eliminado &&
                data.parametroId === parametroId &&
                data.dateKey >= cutoff
            )
        })
        .map((d) => d.ref)

    // Quitar instancias futuras viejas y regenerar con la nueva config
    if (futureRefs.length > 0) {
        await commitBatches(
            futureRefs.map((ref) => (batch) => {
                batch.update(ref, { eliminado: true, updatedAt: now })
            })
        )
    }

    const parametro = normalizeParametroDoc(await getDoc(paramRef))
    const toKey = addDaysToKey(cutoff, HORIZON_DAYS)
    await generateEventsForParametro(parametro, cutoff, toKey)

    await logAction(
        'actualizar',
        'asistencia_parametros',
        parametroId,
        `Parámetro actualizado: ${tituloFinal}`,
        { diasSemana, horaInicio: start, horaFin: end }
    )

    return parametro
}

/**
 * Elimina el parámetro y sus eventos desde hoy en adelante.
 * Los eventos anteriores a hoy se conservan.
 * Usa soft-delete (update) porque deleteDoc suele estar bloqueado en las reglas.
 */
export const deleteParametroAsistencia = async (parametroId) => {
    if (!parametroId) {
        throw new Error('Se requiere el ID del parámetro.')
    }

    const paramRef = doc(db, 'equipos', parametroId)
    const paramSnap = await getDoc(paramRef)
    if (!paramSnap.exists() || paramSnap.data()._modulo !== PARAM_MODULO || paramSnap.data().eliminado) {
        throw new Error('No se encontró el evento parametrizado.')
    }

    const paramData = paramSnap.data()
    const cutoff = todayDateKey()
    const now = Timestamp.fromDate(new Date())

    const eventsSnap = await getDocs(
        query(asistenciasCollection, where('_modulo', '==', ASISTENCIA_MODULO))
    )

    const futureRefs = eventsSnap.docs
        .filter((d) => {
            const data = d.data()
            return (
                !data.eliminado &&
                data.parametroId === parametroId &&
                data.dateKey >= cutoff
            )
        })
        .map((d) => d.ref)

    await commitBatches([
        ...futureRefs.map((ref) => (batch) => {
            batch.update(ref, { eliminado: true, updatedAt: now })
        }),
        (batch) => {
            batch.update(paramRef, { eliminado: true, updatedAt: now })
        }
    ])

    await logAction(
        'eliminar',
        'asistencia_parametros',
        parametroId,
        `Parámetro eliminado: ${paramData.titulo || parametroId} (${futureRefs.length} eventos futuros)`,
        { titulo: paramData.titulo, eliminadosDesde: cutoff, count: futureRefs.length }
    )

    return { deletedFutureEvents: futureRefs.length }
}
