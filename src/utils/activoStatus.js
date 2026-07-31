/** Sin campo o true = activo (docs legacy). Solo valores falsy explícitos desactivan. */
export const isActivo = (entity) => {
    if (!entity) return true
    const v = entity.activo
    if (v === false || v === 0 || v === 'false' || v === '0') return false
    return true
}

export const statusLabel = (entity) => (isActivo(entity) ? 'ACTIVO' : 'INACTIVO')
