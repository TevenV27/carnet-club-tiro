import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthProfile } from '../../context/AuthProfileContext'
import {
    HORA_FIN_MAX,
    HORAS_CALENDARIO,
    METODOS_PAGO,
    createRowId,
    deleteAsistencia,
    formatHoraCorta,
    formatHourLabel,
    getAsistenciaById,
    updateAsistencia
} from '../../services/asistenciaService'
import {
    downloadAsistenciaTemplate,
    parseAsistenciaExcelFile
} from '../../utils/asistenciaExcel'

const AUTOSAVE_DELAY_MS = 700

const emptyRow = () => ({
    id: createRowId(),
    nombre: '',
    telefono: '',
    metodoPago: '',
    estadoPago: '',
    notas: ''
})

const formatDateLabel = (dateKey) => {
    if (!dateKey) return ''
    const [y, m, d] = dateKey.split('-').map(Number)
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

const cleanRegistros = (rows) =>
    rows
        .filter((r) => r.nombre.trim())
        .map((r) => ({
            ...r,
            nombre: r.nombre.trim(),
            telefono: r.telefono.trim(),
            notas: r.notas.trim()
        }))

const inputClass =
    'w-full bg-transparent border-0 px-2 py-1.5 text-tactical-brass font-tactical text-[11px] tracking-[0.04em] focus:outline-none focus:bg-black/40 focus:text-tactical-gold'

const selectClass =
    'w-full bg-black/40 border border-tactical-border/50 px-2 py-1.5 text-tactical-brass font-tactical text-[11px] uppercase tracking-[0.04em] focus:outline-none focus:border-tactical-gold'

function AsistenciaDetailView() {
    const { asistenciaId } = useParams()
    const navigate = useNavigate()
    const { isAdmin, isOperator } = useAuthProfile()
    const canManage = isAdmin || isOperator

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [saveStatus, setSaveStatus] = useState('idle') // idle | pending | saving | saved | error
    const [dirty, setDirty] = useState(false)
    const [ready, setReady] = useState(false)

    const [titulo, setTitulo] = useState('')
    const [dateKey, setDateKey] = useState('')
    const [horaInicio, setHoraInicio] = useState(6)
    const [horaFin, setHoraFin] = useState(7)
    const [registros, setRegistros] = useState([])

    const draftRef = useRef({ titulo: '', horaInicio: 6, horaFin: 7, registros: [] })
    const saveTimerRef = useRef(null)
    const saveRequestIdRef = useRef(0)
    const dirtyRef = useRef(false)
    const importInputRef = useRef(null)

    useEffect(() => {
        draftRef.current = { titulo, horaInicio, horaFin, registros }
    }, [titulo, horaInicio, horaFin, registros])

    useEffect(() => {
        dirtyRef.current = dirty
    }, [dirty])

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            try {
                setLoading(true)
                setReady(false)
                setError(null)
                setSaveStatus('idle')
                const data = await getAsistenciaById(asistenciaId)
                if (!isMounted) return

                if (!data) {
                    setError('No se encontró el evento de asistencia.')
                    return
                }

                setTitulo(data.titulo)
                setDateKey(data.dateKey)
                setHoraInicio(data.horaInicio)
                setHoraFin(data.horaFin)
                setRegistros(data.registros.length > 0 ? data.registros : [emptyRow()])
                setDirty(false)
                setReady(true)
            } catch (err) {
                console.error('Error cargando asistencia:', err)
                if (isMounted) setError('No se pudo cargar el evento.')
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        load()
        return () => {
            isMounted = false
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [asistenciaId])

    const persistDraft = async () => {
        if (!canManage || !ready) return

        const draft = draftRef.current
        const requestId = ++saveRequestIdRef.current

        try {
            setSaving(true)
            setSaveStatus('saving')
            setError(null)

            await updateAsistencia(asistenciaId, {
                titulo: draft.titulo,
                horaInicio: draft.horaInicio,
                horaFin: draft.horaFin,
                registros: cleanRegistros(draft.registros)
            })

            // Ignorar respuestas viejas si hubo otro cambio después
            if (requestId !== saveRequestIdRef.current) return

            setDirty(false)
            setSaveStatus('saved')
        } catch (err) {
            if (requestId !== saveRequestIdRef.current) return
            console.error('Error autoguardando asistencia:', err)
            setError(err.message || 'No se pudo autoguardar.')
            setSaveStatus('error')
        } finally {
            if (requestId === saveRequestIdRef.current) {
                setSaving(false)
            }
        }
    }

    const scheduleAutosave = () => {
        if (!canManage || !ready) return
        setDirty(true)
        setSaveStatus('pending')
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            persistDraft()
        }, AUTOSAVE_DELAY_MS)
    }

    // Guardar al salir si hay cambios pendientes
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            if (canManage && dirtyRef.current && ready) {
                const draft = draftRef.current
                updateAsistencia(asistenciaId, {
                    titulo: draft.titulo,
                    horaInicio: draft.horaInicio,
                    horaFin: draft.horaFin,
                    registros: cleanRegistros(draft.registros)
                }).catch((err) => {
                    console.error('Error guardando al salir:', err)
                })
            }
        }
    }, [asistenciaId, canManage, ready])

    const resumen = useMemo(() => {
        const conNombre = registros.filter((r) => r.nombre.trim())
        const pagados = conNombre.filter((r) => r.estadoPago === 'pagado').length
        const pendientes = conNombre.filter((r) => r.estadoPago === 'pendiente').length
        return { total: conNombre.length, pagados, pendientes }
    }, [registros])

    const updateRow = (rowId, field, value) => {
        setRegistros((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
        )
        scheduleAutosave()
    }

    const addRow = () => {
        setRegistros((prev) => [...prev, emptyRow()])
        scheduleAutosave()
    }

    const removeRow = (rowId) => {
        setRegistros((prev) => {
            const next = prev.filter((row) => row.id !== rowId)
            return next.length > 0 ? next : [emptyRow()]
        })
        scheduleAutosave()
    }

    const handleImportFileChange = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file || !canManage) return

        try {
            setError(null)
            const rows = await parseAsistenciaExcelFile(file)
            // Solo los operadores llenados en el Excel (sin filas vacías extra)
            setRegistros(rows)
            draftRef.current = {
                ...draftRef.current,
                registros: rows
            }
            setDirty(true)
            setSaveStatus('saving')

            // Guardar de inmediato para que queden en la vista y en Firebase
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            await updateAsistencia(asistenciaId, {
                titulo: draftRef.current.titulo,
                horaInicio: draftRef.current.horaInicio,
                horaFin: draftRef.current.horaFin,
                registros: cleanRegistros(rows)
            })
            setDirty(false)
            setSaveStatus('saved')
        } catch (err) {
            console.error('Error importando Excel:', err)
            setError(err.message || 'No se pudo importar el Excel.')
            setSaveStatus('error')
        }
    }

    const handleDelete = async () => {
        if (!canManage) return
        const confirmed = window.confirm(
            `¿Eliminar el evento "${titulo}"? Esta acción no se puede deshacer.`
        )
        if (!confirmed) return

        try {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            setSaving(true)
            await deleteAsistencia(asistenciaId)
            navigate('/asistencia')
        } catch (err) {
            console.error('Error eliminando asistencia:', err)
            setError(err.message || 'No se pudo eliminar el evento.')
            setSaving(false)
        }
    }

    const statusLabel = (() => {
        if (saveStatus === 'pending') return 'Autoguardando…'
        if (saveStatus === 'saving') return 'Guardando…'
        if (saveStatus === 'saved') return 'Guardado'
        if (saveStatus === 'error') return 'Error al guardar'
        if (dirty) return 'Cambios pendientes'
        return 'Autoguardado activo'
    })()

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-[0.08em]">
                    Cargando tabla...
                </div>
            </div>
        )
    }

    if (error && !titulo) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-tactical-dark gap-4 px-6 text-center">
                <div className="text-red-500 font-tactical uppercase tracking-[0.08em]">{error}</div>
                <button
                    type="button"
                    onClick={() => navigate('/asistencia')}
                    className="border border-tactical-border hover:border-tactical-gold px-4 py-2 text-tactical-gold font-tactical text-xs uppercase"
                >
                    Volver al calendario
                </button>
            </div>
        )
    }

    return (
        <div className="p-3 md:p-8 bg-tactical-dark min-h-0 h-auto text-tactical-brass space-y-6 overflow-hidden md:overflow-auto">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => navigate('/asistencia')}
                            className="text-[10px] font-tactical uppercase tracking-[0.1em] text-tactical-brass hover:text-tactical-gold transition-colors"
                        >
                            ← Volver al calendario
                        </button>

                        {canManage ? (
                            <input
                                type="text"
                                value={titulo}
                                onChange={(e) => {
                                    setTitulo(e.target.value)
                                    scheduleAutosave()
                                }}
                                className="w-full bg-transparent border-b border-tactical-border focus:border-tactical-gold text-2xl md:text-3xl font-tactical text-tactical-gold uppercase tracking-[0.08em] focus:outline-none pb-1"
                            />
                        ) : (
                            <h1 className="text-2xl md:text-3xl font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                                {titulo}
                            </h1>
                        )}

                        {canManage ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="text-[10px] font-tactical uppercase tracking-[0.1em] text-tactical-brass/80">
                                    Inicio
                                    <select
                                        value={horaInicio}
                                        onChange={(e) => {
                                            const next = Number(e.target.value)
                                            setHoraInicio(next)
                                            setHoraFin((prev) => Math.max(prev, next + 1))
                                            scheduleAutosave()
                                        }}
                                        className="ml-2 bg-black/60 border border-tactical-border px-2 py-1 text-tactical-gold font-tactical text-[11px] uppercase focus:outline-none focus:border-tactical-gold"
                                    >
                                        {HORAS_CALENDARIO.map((h) => (
                                            <option key={h} value={h}>
                                                {formatHourLabel(h)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-[10px] font-tactical uppercase tracking-[0.1em] text-tactical-brass/80">
                                    Fin
                                    <select
                                        value={horaFin}
                                        onChange={(e) => {
                                            setHoraFin(Number(e.target.value))
                                            scheduleAutosave()
                                        }}
                                        className="ml-2 bg-black/60 border border-tactical-border px-2 py-1 text-tactical-gold font-tactical text-[11px] uppercase focus:outline-none focus:border-tactical-gold"
                                    >
                                        {[...HORAS_CALENDARIO, HORA_FIN_MAX]
                                            .filter((h) => h > horaInicio)
                                            .map((h) => (
                                                <option key={h} value={h}>
                                                    {formatHourLabel(h)}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                            </div>
                        ) : null}

                        <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.1em]">
                            {formatDateLabel(dateKey)} · {formatHoraCorta(horaInicio)}–
                            {formatHoraCorta(horaFin)} · {resumen.total} operadores · {resumen.pagados}{' '}
                            pagados · {resumen.pendientes} pendientes
                            {canManage ? (
                                <span
                                    className={[
                                        ' ml-2',
                                        saveStatus === 'saved'
                                            ? 'text-emerald-400'
                                            : saveStatus === 'error'
                                              ? 'text-red-400'
                                              : saveStatus === 'pending' || saveStatus === 'saving'
                                                ? 'text-tactical-gold'
                                                : 'text-tactical-brass/80'
                                    ].join('')}
                                >
                                    · {statusLabel}
                                </span>
                            ) : null}
                        </p>
                    </div>

                    {canManage ? (
                        <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    downloadAsistenciaTemplate(
                                        `plantilla-asistencia-${dateKey || 'evento'}.xlsx`
                                    ).catch((err) => {
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
                                onClick={handleDelete}
                                disabled={saving}
                                className="bg-transparent hover:bg-red-950/40 text-red-400 font-semibold py-2 px-4 border border-red-800/60 hover:border-red-500 font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                            >
                                Eliminar
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

                {error ? (
                    <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.08em]">
                        {error}
                    </div>
                ) : null}
            </header>

            <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
                <header className="px-[10px] md:px-6 py-[10px] md:py-4 border-b border-tactical-border/60">
                    <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                        Tabla de asistencia
                    </h2>
                    <p className="text-[10px] font-tactical text-tactical-brass/90 uppercase tracking-[0.1em]">
                        Los cambios se guardan solos mientras escribes
                    </p>
                </header>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.06em] text-tactical-brass">
                        <thead className="bg-black/60 text-tactical-brass sticky top-0">
                            <tr>
                                <th className="px-2 py-3 text-left w-10">#</th>
                                <th className="px-2 py-3 text-left min-w-[180px]">Nombre operador</th>
                                <th className="px-2 py-3 text-left min-w-[130px]">Teléfono</th>
                                <th className="px-2 py-3 text-left min-w-[140px]">Método de pago</th>
                                <th className="px-2 py-3 text-left min-w-[120px]">Estado</th>
                                <th className="px-2 py-3 text-left min-w-[160px]">Notas</th>
                                {canManage ? <th className="px-2 py-3 text-left w-16" /> : null}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-tactical-border/40">
                            {registros.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className="hover:bg-black/50 transition-colors duration-150 even:bg-black/20"
                                >
                                    <td className="px-2 py-1 text-tactical-brass/70">{index + 1}</td>
                                    <td className="px-1 py-1 border-l border-tactical-border/20">
                                        {canManage ? (
                                            <input
                                                type="text"
                                                value={row.nombre}
                                                onChange={(e) => updateRow(row.id, 'nombre', e.target.value)}
                                                placeholder="Nombre"
                                                className={inputClass}
                                            />
                                        ) : (
                                            <span className="px-2 py-1.5 block text-tactical-gold">
                                                {row.nombre || '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-1 py-1 border-l border-tactical-border/20">
                                        {canManage ? (
                                            <input
                                                type="tel"
                                                value={row.telefono}
                                                onChange={(e) => updateRow(row.id, 'telefono', e.target.value)}
                                                placeholder="Celular"
                                                className={inputClass}
                                            />
                                        ) : (
                                            <span className="px-2 py-1.5 block">{row.telefono || '—'}</span>
                                        )}
                                    </td>
                                    <td className="px-1 py-1 border-l border-tactical-border/20">
                                        {canManage ? (
                                            <select
                                                value={row.metodoPago}
                                                onChange={(e) => updateRow(row.id, 'metodoPago', e.target.value)}
                                                className={selectClass}
                                            >
                                                <option value="">Seleccionar…</option>
                                                {METODOS_PAGO.map((m) => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="px-2 py-1.5 block">{row.metodoPago || '—'}</span>
                                        )}
                                    </td>
                                    <td className="px-1 py-1 border-l border-tactical-border/20">
                                        {canManage ? (
                                            <select
                                                value={row.estadoPago}
                                                onChange={(e) => updateRow(row.id, 'estadoPago', e.target.value)}
                                                className={[
                                                    selectClass,
                                                    row.estadoPago === 'pagado'
                                                        ? 'text-emerald-400'
                                                        : row.estadoPago === 'pendiente'
                                                          ? 'text-amber-400'
                                                          : ''
                                                ].join(' ')}
                                            >
                                                <option value="">Seleccionar…</option>
                                                <option value="pagado">Pagado</option>
                                                <option value="pendiente">Pendiente</option>
                                            </select>
                                        ) : (
                                            <span
                                                className={[
                                                    'px-2 py-1.5 block',
                                                    row.estadoPago === 'pagado'
                                                        ? 'text-emerald-400'
                                                        : row.estadoPago === 'pendiente'
                                                          ? 'text-amber-400'
                                                          : ''
                                                ].join(' ')}
                                            >
                                                {row.estadoPago === 'pagado'
                                                    ? 'Pagado'
                                                    : row.estadoPago === 'pendiente'
                                                      ? 'Pendiente'
                                                      : '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-1 py-1 border-l border-tactical-border/20">
                                        {canManage ? (
                                            <input
                                                type="text"
                                                value={row.notas}
                                                onChange={(e) => updateRow(row.id, 'notas', e.target.value)}
                                                placeholder="Opcional"
                                                className={inputClass}
                                            />
                                        ) : (
                                            <span className="px-2 py-1.5 block normal-case tracking-normal">
                                                {row.notas || '—'}
                                            </span>
                                        )}
                                    </td>
                                    {canManage ? (
                                        <td className="px-2 py-1 border-l border-tactical-border/20">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="text-red-400/80 hover:text-red-300 text-[10px] uppercase tracking-[0.06em]"
                                                title="Eliminar fila"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    ) : null}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {canManage ? (
                    <div className="px-4 py-3 border-t border-tactical-border/60">
                        <button
                            type="button"
                            onClick={addRow}
                            className="text-[10px] font-tactical uppercase tracking-[0.1em] text-tactical-gold hover:underline"
                        >
                            + Agregar otra fila
                        </button>
                    </div>
                ) : null}
            </section>
        </div>
    )
}

export default AsistenciaDetailView
