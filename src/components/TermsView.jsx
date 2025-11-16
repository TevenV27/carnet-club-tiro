import { useEffect, useState } from 'react'
import { createTerm, deleteTerm, getTerms, updateTerm } from '../services/termsService'

function TermsView() {
    const [terms, setTerms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)
    const [editingTerm, setEditingTerm] = useState(null)
    const [form, setForm] = useState({
        nombre: '',
        duracion: '',
        unidad: 'años'
    })

    const resetForm = () => {
        setEditingTerm(null)
        setForm({
            nombre: '',
            duracion: '',
            unidad: 'años'
        })
    }

    const loadTerms = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getTerms()
            setTerms(data)
        } catch (err) {
            console.error('Error cargando vigencias:', err)
            setError('No se pudieron cargar las vigencias. Intenta nuevamente.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadTerms()
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
            setError('El nombre de la vigencia es obligatorio.')
            return
        }

        if (form.duracion === '' || form.duracion === null || form.duracion === undefined) {
            setError('La duración de la vigencia es obligatoria.')
            return
        }

        try {
            setSaving(true)
            setError(null)

            if (editingTerm) {
                await updateTerm(editingTerm.id, {
                    nombre: form.nombre,
                    duracion: form.duracion,
                    unidad: form.unidad
                })
            } else {
                await createTerm({
                    nombre: form.nombre,
                    duracion: form.duracion,
                    unidad: form.unidad
                })
            }

            await loadTerms()
            resetForm()
        } catch (err) {
            console.error('Error guardando vigencia:', err)
            setError(err.message || 'No se pudo guardar la vigencia. Intenta nuevamente.')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (term) => {
        setEditingTerm(term)
        setForm({
            nombre: term.nombre,
            duracion: term.duracion?.toString() ?? '',
            unidad: term.unidad || 'años'
        })
    }

    const handleDelete = async (term) => {
        const confirmed = window.confirm(
            `¿Deseas eliminar la vigencia "${term.nombre}"? Esta acción no se puede deshacer.`
        )
        if (!confirmed) return

        try {
            setSaving(true)
            setError(null)
            await deleteTerm(term.id)
            await loadTerms()
        } catch (err) {
            console.error('Error eliminando vigencia:', err)
            setError(err.message || 'No se pudo eliminar la vigencia. Intenta nuevamente.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                    Gestión de Vigencias
                </h1>
                <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em]">
                    Define los periodos de vinculación al club (ej: 1 año, 2 años)
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
                            {editingTerm ? 'Editar vigencia' : 'Crear nueva vigencia'}
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Asigna un nombre y la duración correspondiente
                        </p>
                    </div>
                    {editingTerm && (
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
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_auto] gap-4 items-end"
                >
                    <div>
                        <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                            Nombre de la vigencia
                        </label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(event) => handleChange('nombre', event.target.value)}
                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                            placeholder="Ej: Vigencia anual"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                            Duración
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={form.duracion}
                            onChange={(event) => handleChange('duracion', event.target.value)}
                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                            placeholder="Ej: 1"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                            Unidad
                        </label>
                        <select
                            value={form.unidad}
                            onChange={(event) => handleChange('unidad', event.target.value)}
                            className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                        >
                            <option value="meses">Meses</option>
                            <option value="años">Años</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.35em] transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Guardando...' : editingTerm ? 'Actualizar vigencia' : 'Crear vigencia'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-[10px] md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                            Vigencias configuradas
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Periodos de vinculación disponibles para el club
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="h-32 flex items-center justify-center text-[11px] font-tactical uppercase tracking-[0.4em] text-tactical-brass/70">
                        Cargando vigencias...
                    </div>
                ) : terms.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-[11px] font-tactical uppercase tracking-[0.4em] text-tactical-brass/50 bg-black/40 border border-dashed border-tactical-border">
                        Aún no se han registrado vigencias en el sistema.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-tactical-border/40">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass bg-black/40">
                            <thead className="bg-black/60 text-tactical-brass/70">
                                <tr>
                                    <th className="px-4 py-3 text-left">#</th>
                                    <th className="px-4 py-3 text-left">Nombre</th>
                                    <th className="px-4 py-3 text-left">Duración</th>
                                    <th className="px-4 py-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {terms.map((term, index) => (
                                    <tr key={term.id} className="hover:bg-black/50 transition-colors duration-150">
                                        <td className="px-4 py-3 text-tactical-gold">{index + 1}</td>
                                        <td className="px-4 py-3 text-tactical-gold">{term.nombre}</td>
                                        <td className="px-4 py-3 text-tactical-brass/80 text-[10px]">
                                            {term.duracion} {term.unidad}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(term)}
                                                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1 px-3 border border-tactical-border hover:border-tactical-gold font-tactical text-[10px] uppercase tracking-[0.25em] transition-all duración-200"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(term)}
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

export default TermsView


