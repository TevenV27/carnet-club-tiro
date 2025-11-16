import { useEffect, useState } from 'react'
import { createScore, deleteScore, getScores, updateScore } from '../services/scoresService'

function ScoresView() {
    const [scores, setScores] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)
    const [editingScore, setEditingScore] = useState(null)
    const [form, setForm] = useState({
        nombre: '',
        valor: ''
    })

    const resetForm = () => {
        setEditingScore(null)
        setForm({
            nombre: '',
            valor: ''
        })
    }

    const loadScores = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getScores()
            setScores(data)
        } catch (err) {
            console.error('Error cargando puntajes:', err)
            setError('No se pudieron cargar los puntajes. Intenta nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadScores()
    }, [])

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!form.nombre.trim()) {
            setError('El nombre del puntaje es obligatorio.')
            return
        }

        if (form.valor === '' || form.valor === null || form.valor === undefined) {
            setError('El valor del puntaje es obligatorio.')
            return
        }

        try {
            setSaving(true)
            setError(null)

            if (editingScore) {
                await updateScore(editingScore.id, {
                    nombre: form.nombre,
                    valor: form.valor
                })
            } else {
                await createScore({
                    nombre: form.nombre,
                    valor: form.valor
                })
            }

            await loadScores()
            resetForm()
        } catch (err) {
            console.error('Error guardando puntaje:', err)
            setError(err.message || 'No se pudo guardar el puntaje. Intenta nuevamente.')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (score) => {
        setEditingScore(score)
        setForm({
            nombre: score.nombre,
            valor: score.valor?.toString() ?? ''
        })
    }

    const handleDelete = async (score) => {
        const confirmed = window.confirm(
            `¿Deseas eliminar el puntaje "${score.nombre}"? Esta acción no se puede deshacer.`
        )
        if (!confirmed) return

        try {
            setSaving(true)
            setError(null)
            await deleteScore(score.id)
            await loadScores()
        } catch (err) {
            console.error('Error eliminando puntaje:', err)
            setError(err.message || 'No se pudo eliminar el puntaje. Intenta nuevamente.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                    Gestión de Puntajes
                </h1>
                <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em]">
                    Define nombres y valores de puntajes (ej: Primer puesto 50, Participación 10)
                </p>
            </header>

            {error && (
                <div className="bg-red-900/70 border border-red-600 text-red-100 px-4 py-3 text-[11px] font-tactical uppercase tracking-[0.35em]">
                    {error}
                </div>
            )}

            <section className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                            {editingScore ? 'Editar puntaje' : 'Crear nuevo puntaje'}
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Asigna un nombre claro y el valor numérico correspondiente
                        </p>
                    </div>
                    {editingScore && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1.5 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-[10px] uppercase tracking-[0.3em] transition-all duración-200"
                        >
                            Cancelar edición
                        </button>
                    )}
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-4 items-end"
                >
                    <div>
                        <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                            Nombre del puntaje
                        </label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(event) => handleChange('nombre', event.target.value)}
                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                            placeholder="Ej: Primer puesto"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                            Valor (número)
                        </label>
                        <input
                            type="number"
                            value={form.valor}
                            onChange={(event) => handleChange('valor', event.target.value)}
                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                            placeholder="Ej: 50"
                        />
                    </div>
                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.35em] transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Guardando...' : editingScore ? 'Actualizar puntaje' : 'Crear puntaje'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-[10px] md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                            Puntajes configurados
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Tabla de equivalencias de puntajes usados en los torneos
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="h-32 flex items-center justify-center text-[11px] font-tactical uppercase tracking-[0.4em] text-tactical-brass/70">
                        Cargando puntajes...
                    </div>
                ) : scores.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-[11px] font-tactical uppercase tracking-[0.4em] text-tactical-brass/50 bg-black/40 border border-dashed border-tactical-border">
                        Aún no se han registrado puntajes en el sistema.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-tactical-border/40">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass bg-black/40">
                            <thead className="bg-black/60 text-tactical-brass/70">
                                <tr>
                                    <th className="px-4 py-3 text-left">#</th>
                                    <th className="px-4 py-3 text-left">Nombre</th>
                                    <th className="px-4 py-3 text-left">Valor</th>
                                    <th className="px-4 py-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {scores.map((score, index) => (
                                    <tr key={score.id} className="hover:bg-black/50 transition-colors duration-150">
                                        <td className="px-4 py-3 text-tactical-gold">{index + 1}</td>
                                        <td className="px-4 py-3 text-tactical-gold">{score.nombre}</td>
                                        <td className="px-4 py-3 text-tactical-brass/80 text-[10px]">
                                            {score.valor}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(score)}
                                                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1 px-3 border border-tactical-border hover:border-tactical-gold font-tactical text-[10px] uppercase tracking-[0.25em] transition-all duración-200"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(score)}
                                                    className="bg-transparent hover:bg-red-900/40 text-red-400 font-semibold py-1 px-3 border border-red-600 font-tactical text-[10px] uppercase tracking-[0.25em] transition-all duración-200"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

export default ScoresView


