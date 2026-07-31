import JSZip from 'jszip'

const INVALID_PATH_CHARS = /[/\\:*?"<>|]/g

/** Nombre de carpeta seguro para ZIP según cédula. */
export const sanitizeCedulaFolderName = (cedula) => {
    const raw = String(cedula ?? '').trim() || 'sin_cedula'
    return raw.replace(INVALID_PATH_CHARS, '_')
}

const parseDataUrl = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
        return null
    }
    const comma = dataUrl.indexOf(',')
    if (comma === -1) {
        return null
    }
    const header = dataUrl.slice(0, comma)
    const base64 = dataUrl.slice(comma + 1).replace(/\s/g, '')
    const mime = /data:image\/([^;]+)/i.exec(header)
    if (!mime) {
        return null
    }
    let ext = (mime[1] || 'jpeg').toLowerCase()
    if (ext === 'jpeg') {
        ext = 'jpg'
    }
    return { ext, base64 }
}

/**
 * Genera un Blob ZIP: una carpeta por cédula con `frente` y `reverso` (extensiones según datos).
 * Omite carpetas sin ninguna imagen.
 */
export const buildCarnetsZipBlob = async (carnets) => {
    const zip = new JSZip()
    const usedNames = new Map()

    for (const card of carnets) {
        const base = sanitizeCedulaFolderName(card.cedula)
        let folderName = base
        const count = (usedNames.get(base) || 0) + 1
        usedNames.set(base, count)
        if (count > 1) {
            folderName = `${base}_${card.id?.slice(0, 8) || count}`
        }

        const front = parseDataUrl(card.frontCardBase64)
        const back = parseDataUrl(card.backCardBase64)
        if (!front && !back) {
            continue
        }

        const folder = zip.folder(folderName)
        if (front) {
            folder.file(`frente.${front.ext}`, front.base64, { base64: true })
        }
        if (back) {
            folder.file(`reverso.${back.ext}`, back.base64, { base64: true })
        }
    }

    return zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    })
}
