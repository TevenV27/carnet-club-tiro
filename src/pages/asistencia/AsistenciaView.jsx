import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/ui/Modal'
import { useAuthProfile } from '../../context/AuthProfileContext'
import {
    DIAS_SEMANA_OPTIONS,
    HORA_FIN_MAX,
    HORAS_CALENDARIO,
    createAsistencia,
    createParametroAsistencia,
    deleteParametroAsistencia,
    ensureParametrizedEventsForRange,
    formatHoraCorta,
    formatHourLabel,
    getAsistenciasByRange,
    getParametrosAsistencia,
    updateAsistencia,
    updateParametroAsistencia
} from '../../services/asistenciaService'
import {
    downloadAsistenciaTemplate,
    parseAsistenciaExcelFile
} from '../../utils/asistenciaExcel'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const SLOT_HEIGHT = 72
const FIRST_HOUR = HORAS_CALENDARIO[0]
const GRID_HEIGHT = HORAS_CALENDARIO.length * SLOT_HEIGHT

const toDateKey = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const parseDateKey = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number)
    return new Date(y, m - 1, d)
}

/** Lunes de la semana que contiene `date` */
const getMonday = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d
}

const addDays = (date, days) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    d.setDate(d.getDate() + days)
    return d
}

const formatDateLabel = (dateKey) => {
    if (!dateKey) return ''
    const date = parseDateKey(dateKey)
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

const weekRangeLabel = (monday) => {
    const sunday = addDays(monday, 6)
    const sameMonth = monday.getMonth() === sunday.getMonth()
    if (sameMonth) {
        return `${monday.getDate()} – ${sunday.getDate()} de ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`
    }
    return `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getFullYear()}`
}

const eventTop = (horaInicio) => (horaInicio - FIRST_HOUR) * SLOT_HEIGHT
const eventHeight = (horaInicio, horaFin) =>
    Math.max(SLOT_HEIGHT * 0.85, (horaFin - horaInicio) * SLOT_HEIGHT - 4)

function AsistenciaView() {
    const navigate = useNavigate()
    const { isAdmin, isOperator } = useAuthProfile()
    const canManage = isAdmin || isOperator

    const today = useMemo(() => new Date(), [])
    const todayKey = toDateKey(today)

    const [weekMonday, setWeekMonday] = useState(() => getMonday(today))
    const [eventos, setEventos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [reloadToken, setReloadToken] = useState(0)

    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)
    const [formData, setFormData] = useState({
        titulo: '',
        dateKey: todayKey,
        horaInicio: 6,
        horaFin: 7
    })

    const [paramModalOpen, setParamModalOpen] = useState(false)
    const [parametros, setParametros] = useState([])
    const [paramLoading, setParamLoading] = useState(false)
    const [paramSaving, setParamSaving] = useState(false)
    const [paramError, setParamError] = useState(null)
    const [editingParamId, setEditingParamId] = useState(null)
    const [paramForm, setParamForm] = useState({
        titulo: '',
        diasSemana: [],
        horaInicio: 9,
        horaFin: 10
    })

    const [importModalOpen, setImportModalOpen] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState(null)
    const [importedRegistros, setImportedRegistros] = useState([])
    const [importTarget, setImportTarget] = useState('existing') // existing | new
    const [importEventId, setImportEventId] = useState('')
    const [importNewForm, setImportNewForm] = useState({
        titulo: '',
        dateKey: todayKey,
        horaInicio: 6,
        horaFin: 7
    })
    const importInputRef = useRef(null)

    const weekDays = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) => {
                const date = addDays(weekMonday, i)
                return {
                    date,
                    dateKey: toDateKey(date),
                    label: WEEKDAY_LABELS[i],
                    dayNumber: date.getDate(),
                    isToday: toDateKey(date) === todayKey
                }
            }),
        [weekMonday, todayKey]
    )

    const startKey = weekDays[0].dateKey
    const endKey = weekDays[6].dateKey

    const eventosPorDia = useMemo(() => {
        const map = new Map()
        weekDays.forEach((day) => map.set(day.dateKey, []))
        eventos.forEach((evento) => {
            const list = map.get(evento.dateKey)
            if (list) list.push(evento)
        })
        return map
    }, [eventos, weekDays])

    useEffect(() => {
        let isMounted = true

        const fetchWeek = async () => {
            try {
                setLoading(true)
                setError(null)
                await ensureParametrizedEventsForRange(startKey, endKey)
                const data = await getAsistenciasByRange(startKey, endKey)
                if (!isMounted) return
                setEventos(data)
            } catch (err) {
                console.error('Error cargando asistencias:', err)
                if (isMounted) setError('No se pudieron cargar las asistencias de la semana.')
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchWeek()
        return () => {
            isMounted = false
        }
    }, [startKey, endKey, reloadToken])

    const goPrevWeek = () => setWeekMonday((prev) => addDays(prev, -7))
    const goNextWeek = () => setWeekMonday((prev) => addDays(prev, 7))
    const goToday = () => setWeekMonday(getMonday(today))

    const openCreate = (dateKey, horaInicio = 6) => {
        if (!canManage) return
        const start = horaInicio
        const end = Math.min(HORA_FIN_MAX, start + 1)
        setFormError(null)
        setFormData({
            titulo: `Asistencia ${formatDateLabel(dateKey)} ${formatHoraCorta(start)}`,
            dateKey,
            horaInicio: start,
            horaFin: end
        })
        setCreateModalOpen(true)
    }

    const handleSlotClick = (dateKey, event) => {
        if (!canManage) return
        const rect = event.currentTarget.getBoundingClientRect()
        const y = event.clientY - rect.top
        const hourIndex = Math.min(
            HORAS_CALENDARIO.length - 1,
            Math.max(0, Math.floor(y / SLOT_HEIGHT))
        )
        openCreate(dateKey, HORAS_CALENDARIO[hourIndex])
    }

    const handleCreate = async (event) => {
        event?.preventDefault?.()
        if (!formData.dateKey) {
            setFormError('Selecciona una fecha.')
            return
        }
        if (formData.horaFin <= formData.horaInicio) {
            setFormError('La hora de fin debe ser posterior a la de inicio.')
            return
        }

        try {
            setSaving(true)
            setFormError(null)
            const created = await createAsistencia({
                titulo: formData.titulo,
                dateKey: formData.dateKey,
                horaInicio: formData.horaInicio,
                horaFin: formData.horaFin
            })
            setCreateModalOpen(false)
            // Quedarse en el calendario y refrescar
            setEventos((prev) => {
                const withoutDup = prev.filter((e) => e.id !== created.id)
                return [...withoutDup, created]
            })
            setReloadToken((n) => n + 1)
        } catch (err) {
            console.error('Error creando asistencia:', err)
            const detail = err?.code ? ` [${err.code}]` : ''
            setFormError(
                `${err.message || 'No se pudo crear el evento.'}${detail}`
            )
        } finally {
            setSaving(false)
        }
    }

    const loadParametros = async () => {
        try {
            setParamLoading(true)
            setParamError(null)
            const data = await getParametrosAsistencia()
            setParametros(data)
        } catch (err) {
            console.error('Error cargando parámetros:', err)
            setParamError(err.message || 'No se pudieron cargar los parámetros.')
        } finally {
            setParamLoading(false)
        }
    }

    const openParamModal = () => {
        setParamError(null)
        setEditingParamId(null)
        setParamForm({
            titulo: '',
            diasSemana: [6],
            horaInicio: 9,
            horaFin: 10
        })
        setParamModalOpen(true)
        loadParametros()
    }

    const resetParamForm = () => {
        setEditingParamId(null)
        setParamForm({
            titulo: '',
            diasSemana: [6],
            horaInicio: 9,
            horaFin: 10
        })
        setParamError(null)
    }

    const startEditParametro = (parametro) => {
        setParamError(null)
        setEditingParamId(parametro.id)
        setParamForm({
            titulo: parametro.titulo || '',
            diasSemana: [...(parametro.diasSemana || [])],
            horaInicio: parametro.horaInicio,
            horaFin: parametro.horaFin
        })
    }

    const toggleParamDay = (dayValue) => {
        setParamForm((prev) => {
            const exists = prev.diasSemana.includes(dayValue)
            return {
                ...prev,
                diasSemana: exists
                    ? prev.diasSemana.filter((d) => d !== dayValue)
                    : [...prev.diasSemana, dayValue]
            }
        })
    }

    const handleSaveParametro = async (event) => {
        event?.preventDefault?.()
        if (!paramForm.titulo.trim()) {
            setParamError('El título es obligatorio.')
            return
        }
        if (paramForm.diasSemana.length === 0) {
            setParamError('Selecciona al menos un día.')
            return
        }
        if (paramForm.horaFin <= paramForm.horaInicio) {
            setParamError('La hora de fin debe ser posterior a la de inicio.')
            return
        }

        try {
            setParamSaving(true)
            setParamError(null)
            if (editingParamId) {
                await updateParametroAsistencia(editingParamId, paramForm)
            } else {
                await createParametroAsistencia(paramForm)
            }
            resetParamForm()
            await loadParametros()
            setReloadToken((n) => n + 1)
        } catch (err) {
            console.error('Error guardando parámetro:', err)
            setParamError(err.message || 'No se pudo guardar el parámetro.')
        } finally {
            setParamSaving(false)
        }
    }

    const handleDeleteParametro = async (parametro) => {
        const diasLabel = parametro.diasSemana
            .map((d) => DIAS_SEMANA_OPTIONS.find((o) => o.value === d)?.label || d)
            .join(', ')
        const confirmed = window.confirm(
            `¿Eliminar el parámetro "${parametro.titulo}" (${diasLabel} ${formatHoraCorta(parametro.horaInicio)}–${formatHoraCorta(parametro.horaFin)})?\n\nSe eliminarán solo los eventos de hoy en adelante. Los anteriores se conservan.`
        )
        if (!confirmed) return

        try {
            setParamSaving(true)
            setParamError(null)
            await deleteParametroAsistencia(parametro.id)
            if (editingParamId === parametro.id) {
                resetParamForm()
            }
            await loadParametros()
            setReloadToken((n) => n + 1)
        } catch (err) {
            console.error('Error eliminando parámetro:', err)
            setParamError(err.message || 'No se pudo eliminar el parámetro.')
        } finally {
            setParamSaving(false)
        }
    }

    const handleImportFileChange = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        try {
            setImportError(null)
            const registros = await parseAsistenciaExcelFile(file)
            setImportedRegistros(registros)
            setImportTarget(eventos.length > 0 ? 'existing' : 'new')
            setImportEventId(eventos[0]?.id || '')
            setImportNewForm({
                titulo: `Asistencia importada ${formatDateLabel(todayKey)}`,
                dateKey: todayKey,
                horaInicio: 6,
                horaFin: 7
            })
            setImportModalOpen(true)
        } catch (err) {
            console.error('Error leyendo Excel:', err)
            setError(err.message || 'No se pudo leer el Excel.')
        }
    }

    const handleConfirmImport = async () => {
        if (!importedRegistros.length) {
            setImportError('No hay datos para importar.')
            return
        }

        try {
            setImporting(true)
            setImportError(null)

            if (importTarget === 'existing') {
                if (!importEventId) {
                    setImportError('Selecciona un evento.')
                    return
                }
                await updateAsistencia(importEventId, { registros: importedRegistros })
                setImportModalOpen(false)
                setImportedRegistros([])
                navigate(`/asistencia/${importEventId}`)
                return
            }

            if (importNewForm.horaFin <= importNewForm.horaInicio) {
                setImportError('La hora de fin debe ser posterior a la de inicio.')
                return
            }

            const created = await createAsistencia({
                titulo: importNewForm.titulo,
                dateKey: importNewForm.dateKey,
                horaInicio: importNewForm.horaInicio,
                horaFin: importNewForm.horaFin,
                registros: importedRegistros
            })
            setImportModalOpen(false)
            setImportedRegistros([])
            navigate(`/asistencia/${created.id}`)
        } catch (err) {
            console.error('Error importando asistencia:', err)
            setImportError(err.message || 'No se pudo importar la asistencia.')
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden p-3 md:p-6 bg-tactical-dark text-tactical-brass gap-3 md:gap-4">
            <header className="shrink-0 border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-5 shadow-[0_0_25px_rgba(0,0,0,0.6)]">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                            Asistencia
                        </h1>
                        <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.1em]">
                            Calendario semanal · 6:00 a. m. – 12:00 a. m.
                        </p>
                    </div>
                    {canManage ? (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    downloadAsistenciaTemplate().catch((err) => {
                                        console.error(err)
                                        setError('No se pudo descargar la plantilla.')
                                    })
                                }}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                            >
                                Descargar plantilla
                            </button>
                            <button
                                type="button"
                                onClick={() => importInputRef.current?.click()}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                            >
                                Importar asistencia
                            </button>
                            <button
                                type="button"
                                onClick={openParamModal}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 md:px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                            >
                                Parametrización
                            </button>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                className="hidden"
                                onChange={handleImportFileChange}
                            />
                        </div>
                    ) : null}
                </div>
            </header>

            {error ? (
                <div className="shrink-0 bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.08em]">
                    {error}
                </div>
            ) : null}

            <section className="flex-1 min-h-0 flex flex-col bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
                <header className="shrink-0 px-[10px] md:px-6 py-[10px] md:py-3 border-b border-tactical-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.08em] capitalize">
                            {weekRangeLabel(weekMonday)}
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/90 uppercase tracking-[0.1em]">
                            {canManage
                                ? 'Clic en una franja horaria para crear · Clic en un evento para abrir la tabla'
                                : 'Clic en un evento para consultar la tabla'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={goPrevWeek}
                            className="border border-tactical-border hover:border-tactical-gold px-3 py-1.5 text-tactical-brass hover:text-tactical-gold font-tactical text-xs uppercase transition-colors"
                        >
                            ‹ Semana
                        </button>
                        <button
                            type="button"
                            onClick={goToday}
                            className="border border-tactical-border hover:border-tactical-gold px-3 py-1.5 text-tactical-brass hover:text-tactical-gold font-tactical text-[10px] uppercase tracking-[0.06em] transition-colors"
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            onClick={goNextWeek}
                            className="border border-tactical-border hover:border-tactical-gold px-3 py-1.5 text-tactical-brass hover:text-tactical-gold font-tactical text-xs uppercase transition-colors"
                        >
                            Semana ›
                        </button>
                    </div>
                </header>

                {loading && eventos.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-tactical-gold font-tactical uppercase tracking-[0.08em]">
                        Cargando calendario...
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-auto">
                        <div className="min-w-[760px]">
                            {/* Encabezado días — sticky dentro del scroll del calendario */}
                            <div
                                className="sticky top-0 z-20 grid border-b border-tactical-border/60 bg-black/95 backdrop-blur-sm"
                                style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}
                            >
                                <div className="border-r border-tactical-border/40 px-2 py-3 text-[9px] font-tactical uppercase tracking-[0.1em] text-tactical-brass/70">
                                    Hora
                                </div>
                                {weekDays.map((day) => (
                                    <div
                                        key={day.dateKey}
                                        className={[
                                            'border-r border-tactical-border/40 last:border-r-0 px-2 py-3 text-center',
                                            day.isToday ? 'bg-tactical-gold/10' : ''
                                        ].join(' ')}
                                    >
                                        <div
                                            className={[
                                                'text-[10px] font-tactical uppercase tracking-[0.1em]',
                                                day.isToday ? 'text-tactical-gold' : 'text-tactical-brass/80'
                                            ].join(' ')}
                                        >
                                            {day.label}
                                        </div>
                                        <div
                                            className={[
                                                'mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-tactical',
                                                day.isToday
                                                    ? 'bg-tactical-gold text-black'
                                                    : 'text-tactical-brass'
                                            ].join(' ')}
                                        >
                                            {day.dayNumber}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Grilla: columnas por día con eventos que abarcan varias horas */}
                            <div
                                className="grid"
                                style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}
                            >
                                {/* Columna de horas */}
                                <div
                                    className="relative border-r border-tactical-border/40"
                                    style={{ height: GRID_HEIGHT }}
                                >
                                    {HORAS_CALENDARIO.map((hour, index) => (
                                        <div
                                            key={hour}
                                            className="absolute left-0 right-0 border-b border-tactical-border/30 px-2 py-2 text-[10px] font-tactical text-tactical-brass/80 leading-tight"
                                            style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                                        >
                                            {formatHourLabel(hour)}
                                        </div>
                                    ))}
                                </div>

                                {/* Columnas de días */}
                                {weekDays.map((day) => {
                                    const dayEvents = eventosPorDia.get(day.dateKey) || []

                                    return (
                                        <div
                                            key={day.dateKey}
                                            className={[
                                                'relative border-r border-tactical-border/30 last:border-r-0',
                                                day.isToday ? 'bg-tactical-gold/[0.03]' : 'bg-black/20',
                                                canManage ? 'cursor-pointer' : ''
                                            ].join(' ')}
                                            style={{ height: GRID_HEIGHT }}
                                            onClick={(e) => handleSlotClick(day.dateKey, e)}
                                        >
                                            {/* Líneas de hora */}
                                            {HORAS_CALENDARIO.map((hour, index) => (
                                                <div
                                                    key={hour}
                                                    className={[
                                                        'absolute left-0 right-0 border-b border-tactical-border/30',
                                                        canManage ? 'hover:bg-tactical-gold/10' : ''
                                                    ].join(' ')}
                                                    style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                                                />
                                            ))}

                                            {/* Eventos posicionados por duración */}
                                            {dayEvents.map((evento) => (
                                                <button
                                                    key={evento.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/asistencia/${evento.id}`)
                                                    }}
                                                    className="absolute left-1 right-1 z-10 text-left rounded-sm px-1.5 py-1 bg-tactical-gold/25 border border-tactical-gold/50 border-l-[3px] border-l-tactical-gold hover:bg-tactical-gold/40 transition-colors overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                                                    style={{
                                                        top: eventTop(evento.horaInicio) + 2,
                                                        height: eventHeight(evento.horaInicio, evento.horaFin)
                                                    }}
                                                    title={`${evento.titulo} · ${formatHoraCorta(evento.horaInicio)}–${formatHoraCorta(evento.horaFin)}`}
                                                >
                                                    <div className="text-[9px] font-tactical text-tactical-gold/90 uppercase tracking-[0.04em]">
                                                        {formatHoraCorta(evento.horaInicio)}–{formatHoraCorta(evento.horaFin)}
                                                    </div>
                                                    <div className="text-[10px] font-tactical text-tactical-gold uppercase tracking-[0.03em] line-clamp-2">
                                                        {evento.titulo}
                                                    </div>
                                                    {evento.registros.length > 0 ? (
                                                        <div className="text-[8px] font-tactical text-tactical-brass/90 uppercase mt-0.5">
                                                            {evento.registros.length} reg.
                                                        </div>
                                                    ) : null}
                                                </button>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {canManage && createModalOpen ? (
                <Modal
                    title="Crear evento de asistencia"
                    onClose={() => {
                        if (!saving) setCreateModalOpen(false)
                    }}
                    footer={(
                        <>
                            <button
                                type="button"
                                onClick={() => !saving && setCreateModalOpen(false)}
                                disabled={saving}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={saving}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Creando...' : 'Crear evento'}
                            </button>
                        </>
                    )}
                >
                    <form className="space-y-4" onSubmit={handleCreate}>
                        {formError ? (
                            <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.08em]">
                                {formError}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={formData.dateKey}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, dateKey: e.target.value }))
                                    }
                                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                    Hora inicio
                                </label>
                                <select
                                    value={formData.horaInicio}
                                    onChange={(e) => {
                                        const horaInicio = Number(e.target.value)
                                        setFormData((prev) => ({
                                            ...prev,
                                            horaInicio,
                                            horaFin: Math.max(prev.horaFin, horaInicio + 1)
                                        }))
                                    }}
                                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                >
                                    {HORAS_CALENDARIO.map((h) => (
                                        <option key={h} value={h}>
                                            {formatHourLabel(h)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                    Hora fin
                                </label>
                                <select
                                    value={formData.horaFin}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            horaFin: Number(e.target.value)
                                        }))
                                    }
                                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                >
                                    {[...HORAS_CALENDARIO, HORA_FIN_MAX]
                                        .filter((h) => h > formData.horaInicio)
                                        .map((h) => (
                                            <option key={h} value={h}>
                                                {formatHourLabel(h)}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                Título del evento
                            </label>
                            <input
                                type="text"
                                value={formData.titulo}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                                }
                                placeholder="Ej. Turno mañana / Grupo A"
                                className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                            />
                        </div>
                    </form>
                </Modal>
            ) : null}

            {canManage && importModalOpen ? (
                <Modal
                    title="Importar asistencia"
                    onClose={() => {
                        if (!importing) {
                            setImportModalOpen(false)
                            setImportedRegistros([])
                            setImportError(null)
                        }
                    }}
                    footer={(
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!importing) {
                                        setImportModalOpen(false)
                                        setImportedRegistros([])
                                        setImportError(null)
                                    }
                                }}
                                disabled={importing}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmImport}
                                disabled={importing}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {importing ? 'Importando...' : 'Importar y abrir tabla'}
                            </button>
                        </>
                    )}
                >
                    <div className="space-y-4">
                        {importError ? (
                            <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.08em]">
                                {importError}
                            </div>
                        ) : null}

                        <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.08em]">
                            Se encontraron {importedRegistros.length} operador
                            {importedRegistros.length === 1 ? '' : 'es'} con nombre
                            llenado. Elige dónde cargarlos.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <label className="flex items-center gap-2 text-[11px] font-tactical uppercase tracking-[0.06em] text-tactical-brass cursor-pointer">
                                <input
                                    type="radio"
                                    name="importTarget"
                                    checked={importTarget === 'existing'}
                                    disabled={eventos.length === 0}
                                    onChange={() => setImportTarget('existing')}
                                />
                                Evento existente
                            </label>
                            <label className="flex items-center gap-2 text-[11px] font-tactical uppercase tracking-[0.06em] text-tactical-brass cursor-pointer">
                                <input
                                    type="radio"
                                    name="importTarget"
                                    checked={importTarget === 'new'}
                                    onChange={() => setImportTarget('new')}
                                />
                                Crear evento nuevo
                            </label>
                        </div>

                        {importTarget === 'existing' ? (
                            <div>
                                <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                    Evento
                                </label>
                                {eventos.length === 0 ? (
                                    <p className="text-[11px] text-amber-400 font-tactical uppercase">
                                        No hay eventos en esta semana. Crea uno nuevo.
                                    </p>
                                ) : (
                                    <select
                                        value={importEventId}
                                        onChange={(e) => setImportEventId(e.target.value)}
                                        className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                    >
                                        {eventos.map((evento) => (
                                            <option key={evento.id} value={evento.id}>
                                                {formatDateLabel(evento.dateKey)} · {formatHoraCorta(evento.horaInicio)}–
                                                {formatHoraCorta(evento.horaFin)} · {evento.titulo}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                        Título
                                    </label>
                                    <input
                                        type="text"
                                        value={importNewForm.titulo}
                                        onChange={(e) =>
                                            setImportNewForm((prev) => ({ ...prev, titulo: e.target.value }))
                                        }
                                        className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        value={importNewForm.dateKey}
                                        onChange={(e) =>
                                            setImportNewForm((prev) => ({ ...prev, dateKey: e.target.value }))
                                        }
                                        className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                            Inicio
                                        </label>
                                        <select
                                            value={importNewForm.horaInicio}
                                            onChange={(e) => {
                                                const horaInicio = Number(e.target.value)
                                                setImportNewForm((prev) => ({
                                                    ...prev,
                                                    horaInicio,
                                                    horaFin: Math.max(prev.horaFin, horaInicio + 1)
                                                }))
                                            }}
                                            className="w-full bg-black/60 border border-tactical-border px-3 py-2 text-tactical-gold font-tactical text-[11px] uppercase focus:outline-none focus:border-tactical-gold"
                                        >
                                            {HORAS_CALENDARIO.map((h) => (
                                                <option key={h} value={h}>
                                                    {formatHourLabel(h)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                            Fin
                                        </label>
                                        <select
                                            value={importNewForm.horaFin}
                                            onChange={(e) =>
                                                setImportNewForm((prev) => ({
                                                    ...prev,
                                                    horaFin: Number(e.target.value)
                                                }))
                                            }
                                            className="w-full bg-black/60 border border-tactical-border px-3 py-2 text-tactical-gold font-tactical text-[11px] uppercase focus:outline-none focus:border-tactical-gold"
                                        >
                                            {[...HORAS_CALENDARIO, HORA_FIN_MAX]
                                                .filter((h) => h > importNewForm.horaInicio)
                                                .map((h) => (
                                                    <option key={h} value={h}>
                                                        {formatHourLabel(h)}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            ) : null}

            {canManage && paramModalOpen ? (
                <Modal
                    title="Parametrización de eventos"
                    onClose={() => {
                        if (!paramSaving) setParamModalOpen(false)
                    }}
                    footer={(
                        <button
                            type="button"
                            onClick={() => !paramSaving && setParamModalOpen(false)}
                            disabled={paramSaving}
                            className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                        >
                            Cerrar
                        </button>
                    )}
                >
                    <div className="space-y-6">
                        {paramError ? (
                            <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.08em]">
                                {paramError}
                            </div>
                        ) : null}

                        <p className="text-[10px] font-tactical text-tactical-brass/90 uppercase tracking-[0.08em]">
                            Los eventos parametrizados se crean automáticamente todos los días
                            elegidos (desde hoy). Al editar o eliminar, solo se afectan los eventos
                            de hoy en adelante; los anteriores se conservan.
                        </p>

                        <section className="space-y-3">
                            <h3 className="text-sm font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                                Eventos parametrizados
                            </h3>
                            {paramLoading ? (
                                <p className="text-[11px] font-tactical uppercase text-tactical-brass">
                                    Cargando...
                                </p>
                            ) : parametros.length === 0 ? (
                                <p className="text-[11px] font-tactical uppercase text-tactical-brass/80">
                                    Aún no hay eventos parametrizados.
                                </p>
                            ) : (
                                <ul className="divide-y divide-tactical-border/40 border border-tactical-border/50">
                                    {parametros.map((param) => {
                                        const diasLabel = param.diasSemana
                                            .map(
                                                (d) =>
                                                    DIAS_SEMANA_OPTIONS.find((o) => o.value === d)
                                                        ?.label || d
                                            )
                                            .join(', ')
                                        return (
                                            <li
                                                key={param.id}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-3"
                                            >
                                                <div>
                                                    <p className="text-[12px] font-tactical text-tactical-gold uppercase tracking-[0.04em]">
                                                        {param.titulo}
                                                    </p>
                                                    <p className="text-[10px] font-tactical text-tactical-brass uppercase tracking-[0.06em]">
                                                        {diasLabel} · {formatHoraCorta(param.horaInicio)}–
                                                        {formatHoraCorta(param.horaFin)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                                                    <button
                                                        type="button"
                                                        disabled={paramSaving}
                                                        onClick={() => startEditParametro(param)}
                                                        className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1.5 px-3 border border-tactical-border hover:border-tactical-gold font-tactical text-[10px] uppercase tracking-normal transition-all duration-200"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={paramSaving}
                                                        onClick={() => handleDeleteParametro(param)}
                                                        className="bg-transparent hover:bg-red-950/40 text-red-400 font-semibold py-1.5 px-3 border border-red-800/60 hover:border-red-500 font-tactical text-[10px] uppercase tracking-normal transition-all duration-200"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </section>

                        <section className="space-y-4 border-t border-tactical-border/40 pt-5">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                                    {editingParamId ? 'Editar parámetro' : 'Crear parámetro'}
                                </h3>
                                {editingParamId ? (
                                    <button
                                        type="button"
                                        onClick={resetParamForm}
                                        disabled={paramSaving}
                                        className="text-[10px] font-tactical uppercase tracking-[0.08em] text-tactical-brass hover:text-tactical-gold"
                                    >
                                        Cancelar edición
                                    </button>
                                ) : null}
                            </div>
                            <form className="space-y-4" onSubmit={handleSaveParametro}>
                                <div>
                                    <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                        Título
                                    </label>
                                    <input
                                        type="text"
                                        value={paramForm.titulo}
                                        onChange={(e) =>
                                            setParamForm((prev) => ({
                                                ...prev,
                                                titulo: e.target.value
                                            }))
                                        }
                                        placeholder="Ej. Turno sábado mañana"
                                        className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                        Días de la semana
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {DIAS_SEMANA_OPTIONS.map((dia) => {
                                            const active = paramForm.diasSemana.includes(dia.value)
                                            return (
                                                <button
                                                    key={dia.value}
                                                    type="button"
                                                    onClick={() => toggleParamDay(dia.value)}
                                                    className={[
                                                        'px-3 py-1.5 border font-tactical text-[10px] uppercase tracking-[0.06em] transition-colors',
                                                        active
                                                            ? 'border-tactical-gold text-tactical-gold bg-tactical-gold/15'
                                                            : 'border-tactical-border text-tactical-brass hover:border-tactical-gold'
                                                    ].join(' ')}
                                                >
                                                    {dia.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                            Hora inicio
                                        </label>
                                        <select
                                            value={paramForm.horaInicio}
                                            onChange={(e) => {
                                                const horaInicio = Number(e.target.value)
                                                setParamForm((prev) => ({
                                                    ...prev,
                                                    horaInicio,
                                                    horaFin: Math.max(prev.horaFin, horaInicio + 1)
                                                }))
                                            }}
                                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                        >
                                            {HORAS_CALENDARIO.map((h) => (
                                                <option key={h} value={h}>
                                                    {formatHourLabel(h)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em] mb-2">
                                            Hora fin
                                        </label>
                                        <select
                                            value={paramForm.horaFin}
                                            onChange={(e) =>
                                                setParamForm((prev) => ({
                                                    ...prev,
                                                    horaFin: Number(e.target.value)
                                                }))
                                            }
                                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
                                        >
                                            {[...HORAS_CALENDARIO, HORA_FIN_MAX]
                                                .filter((h) => h > paramForm.horaInicio)
                                                .map((h) => (
                                                    <option key={h} value={h}>
                                                        {formatHourLabel(h)}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                {editingParamId ? (
                                    <p className="text-[10px] font-tactical text-tactical-brass/80 uppercase tracking-[0.06em]">
                                        Al guardar se actualizan solo los eventos de hoy en adelante.
                                    </p>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={paramSaving}
                                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200 disabled:opacity-60"
                                >
                                    {paramSaving
                                        ? 'Guardando...'
                                        : editingParamId
                                          ? 'Guardar cambios'
                                          : 'Crear parámetro'}
                                </button>
                            </form>
                        </section>
                    </div>
                </Modal>
            ) : null}
        </div>
    )
}

export default AsistenciaView
