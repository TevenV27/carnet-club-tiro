import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { createRowId, METODOS_PAGO } from '../services/asistenciaService'

export const ASISTENCIA_HEADERS = [
    'Nombre operador',
    'Teléfono',
    'Método de pago',
    'Estado',
    'Notas'
]

const ESTADOS_EXCEL = ['Pagado', 'Pendiente']
const DATA_ROWS = 50 // filas con select listo para llenar

const COLORS = {
    headerBg: '1C2028',
    headerFg: 'D4AF37',
    accent: 'D4AF37',
    border: '4A5568',
    rowEven: 'F7F4EC',
    rowOdd: 'FFFFFF',
    inputBg: 'FFFDF8',
    muted: '6B7280',
    title: '0C0D11'
}

const normalizeHeader = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

const HEADER_ALIASES = {
    nombre: ['nombre operador', 'nombre', 'operador', 'name'],
    telefono: ['telefono', 'celular', 'contacto', 'phone'],
    metodoPago: ['metodo de pago', 'metodo', 'pago', 'payment'],
    estadoPago: ['estado', 'estado pago', 'estado de pago', 'pagado'],
    notas: ['notas', 'nota', 'observaciones', 'comentario', 'comentarios']
}

const resolveMetodoPago = (raw) => {
    const value = String(raw || '').trim()
    if (!value) return ''
    const found = METODOS_PAGO.find(
        (m) => normalizeHeader(m) === normalizeHeader(value)
    )
    return found || ''
}

const resolveEstadoPago = (raw) => {
    const value = normalizeHeader(raw)
    if (!value) return ''
    if (
        value === 'pagado' ||
        value === 'pago' ||
        value === 'si' ||
        value === 'yes' ||
        value === '1' ||
        value === 'true'
    ) {
        return 'pagado'
    }
    if (value === 'pendiente' || value === 'no' || value === '0' || value === 'false') {
        return 'pendiente'
    }
    return ''
}

const mapHeaderIndex = (headerRow) => {
    const indexes = {
        nombre: -1,
        telefono: -1,
        metodoPago: -1,
        estadoPago: -1,
        notas: -1
    }

    headerRow.forEach((cell, index) => {
        const key = normalizeHeader(cell)
        Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
            if (indexes[field] === -1 && aliases.includes(key)) {
                indexes[field] = index
            }
        })
    })

    return indexes
}

const thinBorder = {
    top: { style: 'thin', color: { argb: `FF${COLORS.border}` } },
    left: { style: 'thin', color: { argb: `FF${COLORS.border}` } },
    bottom: { style: 'thin', color: { argb: `FF${COLORS.border}` } },
    right: { style: 'thin', color: { argb: `FF${COLORS.border}` } }
}

const triggerBrowserDownload = (buffer, filename) => {
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/** Descarga plantilla Excel formateada con selects en Método de pago y Estado. */
export const downloadAsistenciaTemplate = async (
    filename = 'plantilla-asistencia.xlsx'
) => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Club Tiro'
    workbook.created = new Date()

    // Primero la hoja visible de asistencia
    const sheet = workbook.addWorksheet('Asistencia', {
        views: [{ state: 'frozen', ySplit: 3 }]
    })

    // Luego catálogos (oculta) para los desplegables
    const listsSheet = workbook.addWorksheet('Listas', { state: 'hidden' })
    METODOS_PAGO.forEach((metodo, index) => {
        listsSheet.getCell(index + 1, 1).value = metodo
    })
    ESTADOS_EXCEL.forEach((estado, index) => {
        listsSheet.getCell(index + 1, 2).value = estado
    })
    listsSheet.getColumn(1).width = 18
    listsSheet.getColumn(2).width = 14

    sheet.columns = [
        { key: 'nombre', width: 32 },
        { key: 'telefono', width: 16 },
        { key: 'metodoPago', width: 18 },
        { key: 'estado', width: 14 },
        { key: 'notas', width: 28 }
    ]

    // Título
    sheet.mergeCells('A1:E1')
    const titleCell = sheet.getCell('A1')
    titleCell.value = 'Plantilla de asistencia — Club Tiro'
    titleCell.font = {
        name: 'Calibri',
        size: 16,
        bold: true,
        color: { argb: `FF${COLORS.headerFg}` }
    }
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${COLORS.headerBg}` }
    }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    sheet.getRow(1).height = 32

    // Instrucciones
    sheet.mergeCells('A2:E2')
    const hintCell = sheet.getCell('A2')
    hintCell.value =
        'Completa una fila por operador. En “Método de pago” y “Estado” elige una opción del menú desplegable (quedan vacíos hasta que selecciones). Luego importa este archivo en la plataforma.'
    hintCell.font = {
        name: 'Calibri',
        size: 10,
        italic: true,
        color: { argb: `FF${COLORS.muted}` }
    }
    hintCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEF1F5' }
    }
    hintCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
    sheet.getRow(2).height = 28

    // Encabezados
    const headerRow = sheet.getRow(3)
    headerRow.height = 22
    ASISTENCIA_HEADERS.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = header
        cell.font = {
            name: 'Calibri',
            size: 11,
            bold: true,
            color: { argb: `FF${COLORS.headerFg}` }
        }
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: `FF${COLORS.headerBg}` }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = thinBorder
    })

    const metodoFormula = `Listas!$A$1:$A$${METODOS_PAGO.length}`
    const estadoFormula = `Listas!$B$1:$B$${ESTADOS_EXCEL.length}`

    // Filas de datos con formato + validación (select) — vacías por defecto
    for (let i = 0; i < DATA_ROWS; i += 1) {
        const rowNumber = 4 + i
        const row = sheet.getRow(rowNumber)
        row.height = 20
        const isEven = i % 2 === 0
        const bg = isEven ? COLORS.rowEven : COLORS.rowOdd

        for (let col = 1; col <= 5; col += 1) {
            const cell = row.getCell(col)
            cell.value = null
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: `FF${bg}` }
            }
            cell.border = thinBorder
            cell.font = { name: 'Calibri', size: 11, color: { argb: `FF${COLORS.title}` } }
            cell.alignment = {
                vertical: 'middle',
                horizontal: col === 1 || col === 5 ? 'left' : 'center'
            }
        }

        // Select método de pago (solo Efectivo / Transferencia)
        row.getCell(3).dataValidation = {
            type: 'list',
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: 'Método inválido',
            error: 'Selecciona Efectivo o Transferencia.',
            formulae: [metodoFormula]
        }

        // Select estado
        row.getCell(4).dataValidation = {
            type: 'list',
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: 'Estado inválido',
            error: 'Selecciona Pagado o Pendiente.',
            formulae: [estadoFormula]
        }

        // Resaltar columnas con select
        row.getCell(3).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: `FF${COLORS.inputBg}` }
        }
        row.getCell(4).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: `FF${COLORS.inputBg}` }
        }
    }

    // Pie de ayuda
    const footerRow = 4 + DATA_ROWS
    sheet.mergeCells(`A${footerRow}:E${footerRow}`)
    const footer = sheet.getCell(`A${footerRow}`)
    footer.value =
        'Métodos: Efectivo, Transferencia  ·  Estados: Pagado, Pendiente'
    footer.font = {
        name: 'Calibri',
        size: 9,
        color: { argb: `FF${COLORS.muted}` }
    }
    footer.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    // Filtro automático en encabezados
    sheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: 5 }
    }

    // Asegurar que Asistencia sea la pestaña activa al abrir
    workbook.views = [{ activeTab: 0 }]

    const buffer = await workbook.xlsx.writeBuffer()
    triggerBrowserDownload(buffer, filename)
}

/**
 * Lee un Excel/CSV y lo convierte a registros de asistencia.
 * @returns {Promise<Array>}
 */
export const parseAsistenciaExcelFile = async (file) => {
    if (!file) {
        throw new Error('Selecciona un archivo Excel.')
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Preferir hoja "Asistencia" si existe
    const sheetName =
        workbook.SheetNames.find((name) => normalizeHeader(name) === 'asistencia') ||
        workbook.SheetNames.find((name) => normalizeHeader(name) !== 'listas') ||
        workbook.SheetNames[0]

    if (!sheetName) {
        throw new Error('El archivo no tiene hojas.')
    }

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false
    })

    if (!rows.length) {
        throw new Error('El archivo está vacío.')
    }

    // Buscar fila de encabezados (puede haber título e instrucciones arriba)
    let headerRowIndex = rows.findIndex((row) => {
        const indexes = mapHeaderIndex(row || [])
        return indexes.nombre !== -1
    })

    if (headerRowIndex === -1) {
        throw new Error(
            'No se encontró la columna "Nombre operador". Usa la plantilla descargada.'
        )
    }

    const headerRow = rows[headerRowIndex]
    const indexes = mapHeaderIndex(headerRow)
    const registros = []

    for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
        const row = rows[i] || []
        const nombre = String(row[indexes.nombre] ?? '').trim()
        const telefono =
            indexes.telefono >= 0 ? String(row[indexes.telefono] ?? '').trim() : ''
        const metodoPago =
            indexes.metodoPago >= 0 ? resolveMetodoPago(row[indexes.metodoPago]) : ''
        const estadoPago =
            indexes.estadoPago >= 0 ? resolveEstadoPago(row[indexes.estadoPago]) : ''
        const notas =
            indexes.notas >= 0 ? String(row[indexes.notas] ?? '').trim() : ''

        // Solo operadores con nombre llenado
        if (!nombre) continue
        if (nombre.toLowerCase().startsWith('ejemplo')) continue
        if (
            nombre.toLowerCase().includes('métodos:') ||
            nombre.toLowerCase().includes('metodos:') ||
            nombre.toLowerCase().includes('completa una fila')
        ) {
            continue
        }

        registros.push({
            id: createRowId(),
            nombre,
            telefono,
            metodoPago,
            estadoPago,
            notas
        })
    }

    if (registros.length === 0) {
        throw new Error(
            'No se encontraron operadores con nombre. Llena la columna "Nombre operador" e intenta de nuevo.'
        )
    }

    return registros
}
