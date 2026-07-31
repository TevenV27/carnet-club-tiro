import QRCode from 'qrcode'
import logoImage from '../assets/logo.png'

// Dimensiones físicas: 6 cm (ancho) × 9 cm (alto), proporción 2:3 — tamaño de la tarjeta donde se pegan las caras
// A 300 DPI: px = round(cm × 300 / 2.54)
export const CARD_WIDTH = 709   // 6 cm
export const CARD_HEIGHT = 1063 // 9 cm

/** Escala de render (p. ej. 2 = ~600 DPI efectivos en el PNG). Mejora nitidez de texto, QR y fotos. */
const RENDER_SCALE = 2

/** Lado máximo del logo del equipo (cara trasera), en coordenadas lógicas del carnet */
const TEAM_LOGO_MAX_SIDE = 180

/** Grosor de trazo en espacio lógico para que en el PNG final coincida con el diseño a escala 1× */
const strokePx = (devicePixels) => devicePixels / RENDER_SCALE
const GOLD_COLOR = '#826030'
const GOLD_COLOR_LIGHT = '#D4AF37'
const DARK_BG = '#151311'  // Fondo oscuro gris café, más cerca del negro

/** Paleta por tipo: airsoft (dorado cálido) vs traumático (verde militar sobre fondo claro). */
const getCardTheme = (formData) => {
    if (formData?.tipoCarnet === 'traumatico') {
        return {
            id: 'traumatico',
            bg: '#12110f',
            accent: '#b08449',
            header: '#c9a66b',
            value: '#af9974',
            divider: '#826030',
            grainAccent: { r: 130, g: 96, b: 48 },
            qrLight: '#D4C5A9',
            stripe: null
        }
    }
    return {
        id: 'airsoft',
        bg: DARK_BG,
        accent: GOLD_COLOR,
        header: '#b08449',
        value: '#af9974',
        divider: '#af9974',
        grainAccent: { r: 130, g: 96, b: 48 },
        qrLight: '#D4C5A9',
        stripe: null
    }
}

/** Fondo táctico (hex, camo digital, mira, chevrons) — solo traumático / fondo claro. */
const drawTraumaticoBackground = (ctx, theme) => {
    const { r, g, b } = theme.grainAccent
    const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`

    // Base con leve variación tonal
    const radial = ctx.createRadialGradient(
        CARD_WIDTH / 2, CARD_HEIGHT * 0.4, 20,
        CARD_WIDTH / 2, CARD_HEIGHT * 0.5, CARD_HEIGHT * 0.85
    )
    radial.addColorStop(0, rgba(0.05))
    radial.addColorStop(1, rgba(0))
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    // Camuflaje digital (bloques angulares)
    const digi = [
        [20, 140, 70, 40, 0.07], [100, 160, 50, 30, 0.05], [40, 200, 90, 35, 0.06],
        [540, 150, 80, 45, 0.07], [600, 210, 55, 28, 0.05], [500, 230, 70, 40, 0.045],
        [30, 680, 100, 50, 0.06], [150, 720, 60, 35, 0.05], [80, 780, 85, 40, 0.055],
        [480, 700, 110, 55, 0.06], [560, 780, 70, 38, 0.05], [520, 850, 95, 45, 0.05],
        [200, 400, 120, 30, 0.035], [380, 450, 80, 50, 0.04], [280, 900, 100, 40, 0.05],
        [0, 500, 55, 80, 0.04], [654, 520, 55, 90, 0.04]
    ]
    digi.forEach(([x, y, w, h, a]) => {
        ctx.fillStyle = rgba(a)
        ctx.fillRect(x, y, w, h)
    })

    // Malla hexagonal
    const hexSize = 26
    const hexH = hexSize * Math.sqrt(3)
    ctx.strokeStyle = rgba(0.09)
    ctx.lineWidth = strokePx(1)
    for (let row = -1; row < CARD_HEIGHT / hexH + 2; row++) {
        for (let col = -1; col < CARD_WIDTH / (hexSize * 1.5) + 2; col++) {
            const cx = col * hexSize * 1.5
            const cy = row * hexH + (col % 2 ? hexH / 2 : 0)
            ctx.beginPath()
            for (let i = 0; i < 6; i++) {
                const ang = (Math.PI / 180) * (60 * i - 30)
                const px = cx + hexSize * Math.cos(ang)
                const py = cy + hexSize * Math.sin(ang)
                if (i === 0) ctx.moveTo(px, py)
                else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.stroke()
        }
    }

    // Rejilla táctica con marcas de medición
    ctx.strokeStyle = rgba(0.08)
    ctx.lineWidth = strokePx(1)
    const grid = 48
    for (let x = grid; x < CARD_WIDTH; x += grid) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, CARD_HEIGHT)
        ctx.stroke()
        // ticks
        for (let y = grid / 2; y < CARD_HEIGHT; y += grid) {
            ctx.beginPath()
            ctx.moveTo(x - 4, y)
            ctx.lineTo(x + 4, y)
            ctx.strokeStyle = rgba(0.12)
            ctx.stroke()
            ctx.strokeStyle = rgba(0.08)
        }
    }
    for (let y = grid; y < CARD_HEIGHT; y += grid) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(CARD_WIDTH, y)
        ctx.stroke()
    }

    // Mira táctica / reticula
    const cx = CARD_WIDTH / 2
    const cy = CARD_HEIGHT * 0.35
    ctx.strokeStyle = rgba(0.14)
    ctx.lineWidth = strokePx(1.5)
    ;[70, 130, 200, 280].forEach((radius) => {
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
    })
    // Cruz principal
    ctx.strokeStyle = rgba(0.16)
    ctx.lineWidth = strokePx(1.25)
    ctx.beginPath()
    ctx.moveTo(cx - 300, cy)
    ctx.lineTo(cx - 18, cy)
    ctx.moveTo(cx + 18, cy)
    ctx.lineTo(cx + 300, cy)
    ctx.moveTo(cx, cy - 300)
    ctx.lineTo(cx, cy - 18)
    ctx.moveTo(cx, cy + 18)
    ctx.lineTo(cx, cy + 300)
    ctx.stroke()
    // Puntos mil-dot
    ctx.fillStyle = rgba(0.18)
    ;[-120, -70, -40, 40, 70, 120].forEach((d) => {
        ctx.beginPath()
        ctx.arc(cx + d, cy, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(cx, cy + d, 2.2, 0, Math.PI * 2)
        ctx.fill()
    })
    // Centro
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(0.2)
    ctx.lineWidth = strokePx(1.5)
    ctx.stroke()

    // Franjas hazard / chevron en laterales
    const drawHazard = (x0, y0, w, h, flip) => {
        ctx.save()
        ctx.beginPath()
        ctx.rect(x0, y0, w, h)
        ctx.clip()
        ctx.strokeStyle = rgba(0.11)
        ctx.lineWidth = strokePx(8)
        const dir = flip ? -1 : 1
        for (let i = -h; i < w + h; i += 18) {
            ctx.beginPath()
            ctx.moveTo(x0 + i, y0)
            ctx.lineTo(x0 + i + dir * h, y0 + h)
            ctx.stroke()
        }
        ctx.restore()
    }
    drawHazard(0, 280, 28, 220, false)
    drawHazard(CARD_WIDTH - 28, 280, 28, 220, true)
    drawHazard(0, 700, 28, 200, false)
    drawHazard(CARD_WIDTH - 28, 700, 28, 200, true)

    // Paneles angulares superiores/inferiores
    ctx.fillStyle = rgba(0.05)
    ctx.beginPath()
    ctx.moveTo(0, 90)
    ctx.lineTo(140, 90)
    ctx.lineTo(110, 130)
    ctx.lineTo(0, 130)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(CARD_WIDTH, 90)
    ctx.lineTo(CARD_WIDTH - 140, 90)
    ctx.lineTo(CARD_WIDTH - 110, 130)
    ctx.lineTo(CARD_WIDTH, 130)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, CARD_HEIGHT - 90)
    ctx.lineTo(140, CARD_HEIGHT - 90)
    ctx.lineTo(110, CARD_HEIGHT - 130)
    ctx.lineTo(0, CARD_HEIGHT - 130)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(CARD_WIDTH, CARD_HEIGHT - 90)
    ctx.lineTo(CARD_WIDTH - 140, CARD_HEIGHT - 90)
    ctx.lineTo(CARD_WIDTH - 110, CARD_HEIGHT - 130)
    ctx.lineTo(CARD_WIDTH, CARD_HEIGHT - 130)
    ctx.closePath()
    ctx.fill()

    // Esquinas tipo bracket táctico (más marcadas)
    const drawCorner = (x, y, dx, dy) => {
        ctx.strokeStyle = rgba(0.28)
        ctx.lineWidth = strokePx(3)
        ctx.beginPath()
        ctx.moveTo(x, y + dy * 56)
        ctx.lineTo(x, y)
        ctx.lineTo(x + dx * 56, y)
        ctx.stroke()
        ctx.strokeStyle = rgba(0.16)
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(x + dx * 12, y + dy * 42)
        ctx.lineTo(x + dx * 12, y + dy * 12)
        ctx.lineTo(x + dx * 42, y + dy * 12)
        ctx.stroke()
        // notch
        ctx.fillStyle = rgba(0.2)
        ctx.fillRect(x + (dx > 0 ? 0 : -10), y + (dy > 0 ? 0 : -10), 10, 10)
    }
    const inset = 20
    drawCorner(inset, inset, 1, 1)
    drawCorner(CARD_WIDTH - inset, inset, -1, 1)
    drawCorner(inset, CARD_HEIGHT - inset, 1, -1)
    drawCorner(CARD_WIDTH - inset, CARD_HEIGHT - inset, -1, -1)

    // Marcas de registro laterales
    ctx.fillStyle = rgba(0.15)
    for (let y = 200; y < CARD_HEIGHT - 180; y += 90) {
        ctx.fillRect(10, y, 8, 2)
        ctx.fillRect(CARD_WIDTH - 18, y, 8, 2)
        ctx.fillRect(10, y + 8, 5, 2)
        ctx.fillRect(CARD_WIDTH - 15, y + 8, 5, 2)
    }
}

// Función auxiliar para cargar imagen
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

// Función auxiliar para dibujar rectángulo redondeado (polyfill para roundRect si no está disponible)
const roundRect = (ctx, x, y, width, height, radius) => {
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, radius)
    } else {
        ctx.beginPath()
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + width - radius, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
        ctx.lineTo(x + width, y + height - radius)
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
        ctx.lineTo(x + radius, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.closePath()
    }
}

// Función auxiliar para convertir color hex a RGB
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

// Función auxiliar para aclarar un color RGB
const lightenColor = (r, g, b, factor) => {
    return {
        r: Math.min(255, Math.floor(r + (255 - r) * factor)),
        g: Math.min(255, Math.floor(g + (255 - g) * factor)),
        b: Math.min(255, Math.floor(b + (255 - b) * factor))
    }
}

// Función auxiliar para oscurecer un color RGB
const darkenColor = (r, g, b, factor) => {
    return {
        r: Math.max(0, Math.floor(r * (1 - factor))),
        g: Math.max(0, Math.floor(g * (1 - factor))),
        b: Math.max(0, Math.floor(b * (1 - factor)))
    }
}

// Función para dibujar texto (metalizado en airsoft; plano en traumático vía useFlatText)
let useFlatText = false

const drawTextWithShadow = (ctx, text, x, y, fontSize, fontFamily = 'Arial', color = GOLD_COLOR, bold = true) => {
    ctx.font = `${bold ? 'bold' : 'normal'} ${fontSize}px ${fontFamily}`

    if (useFlatText) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
        ctx.fillText(text, x + 1, y + 1)
        ctx.fillStyle = color
        ctx.fillText(text, x, y)
        return
    }

    // Obtener dimensiones del texto para crear el gradiente
    const metrics = ctx.measureText(text)
    const textWidth = metrics.width
    const textHeight = fontSize

    // Convertir color hex a RGB
    const rgb = hexToRgb(color)
    if (!rgb) {
        // Fallback si no se puede convertir
        ctx.fillStyle = color
        ctx.fillText(text, x, y)
        return
    }

    // Crear colores para el efecto metalizado - más fieles al color base
    const lightColor = lightenColor(rgb.r, rgb.g, rgb.b, 0.10)  // Solo 10% más claro para mantener el color base
    const darkColor = darkenColor(rgb.r, rgb.g, rgb.b, 0.15)     // 15% más oscuro para la sombra

    // Crear gradiente lineal diagonal para efecto metalizado
    // El gradiente va de arriba-izquierda (brillo) a abajo-derecha (sombra)
    const gradient = ctx.createLinearGradient(
        x, y - textHeight / 2,
        x + textWidth, y + textHeight / 2
    )

    // Puntos del gradiente para simular el brillo metálico - más sutiles y fieles al color base
    gradient.addColorStop(0, `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.95)`)
    gradient.addColorStop(0.25, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`)
    gradient.addColorStop(0.45, `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.75)`)  // Punto de luz central más sutil
    gradient.addColorStop(0.55, `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.75)`)
    gradient.addColorStop(0.75, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`)
    gradient.addColorStop(1, `rgba(${darkColor.r}, ${darkColor.g}, ${darkColor.b}, 0.85)`)

    // Dibujar sombra primero (más sutil para colores más claros)
    if (color === '#af9974' || color === '#B8C99A' || color === '#A8C5D0' || color === '#4A5538' || color === '#826030' || color === '#3D2A12' || color === '#E07A7A' || color === '#E8E8E8') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
        ctx.fillText(text, x + 1, y + 1)
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillText(text, x + 2, y + 2)
    }

    // Dibujar texto con efecto metalizado (sin tercer trazo con blur: suaviza y pierde nitidez al exportar)
    ctx.fillStyle = gradient
    ctx.fillText(text, x, y)
}

// Textura de fondo: debe llamarse solo con el color de fondo ya pintado; el contenido (texto, QR, fotos) se dibuja después encima.
// Usa píxeles reales del canvas (getImageData ignora la transformación actual).
const addGrainEffect = (ctx, canvas, intensity = 0.05, grainAccent = { r: 130, g: 96, b: 48 }) => {
    const width = canvas.width
    const height = canvas.height
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Generar ruido granular y aplicarlo a los píxeles existentes
    // Reducido para no afectar la nitidez de textos y fotos
    for (let i = 0; i < data.length; i += 4) {
        // Generar valor aleatorio para el grano con sesgo hacia valores más oscuros
        const randomValue = Math.random()
        // Sesgar hacia valores más oscuros (60% probabilidad de oscurecer más)
        const grain = randomValue < 0.6
            ? (Math.random() - 0.7) * intensity * 255  // Más oscuro
            : (Math.random() - 0.5) * intensity * 255  // Balanceado

        // Aplicar el grano a cada canal RGB manteniendo los valores dentro del rango
        data[i] = Math.max(0, Math.min(255, data[i] + grain))     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain)) // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain)) // B
        // Alpha se mantiene igual
    }

    // Dibujar la imagen modificada de vuelta al canvas
    ctx.putImageData(imageData, 0, 0)

    // Agregar puntos de grano más oscuros y visibles (como papel fotográfico) - reducido
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)'  // Puntos oscuros más sutiles
    const grainPoints = Math.floor(width * height * 0.008)  // Menos puntos oscuros
    for (let i = 0; i < grainPoints; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const size = Math.random() * 1.0 + 0.2  // Puntos más pequeños
        ctx.fillRect(x, y, size, size)
    }

    // Reducir los puntos claros para hacer el granulado más oscuro
    ctx.fillStyle = 'rgba(255, 255, 255, 0.003)'  // Puntos claros muy sutiles
    const lightGrainPoints = Math.floor(width * height * 0.002)  // Menos puntos claros
    for (let i = 0; i < lightGrainPoints; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const size = Math.random() * 0.8 + 0.2  // Puntos más pequeños
        ctx.fillRect(x, y, size, size)
    }

    // Destello diagonal (misma transformación identidad)
    // Calcular la diagonal
    const diagonalLength = Math.sqrt(width * width + height * height)
    const { r, g, b } = grainAccent

    // Crear gradiente lineal diagonal con tonos del tema del carnet
    const gradient = ctx.createLinearGradient(
        -diagonalLength * 0.3, -diagonalLength * 0.3,  // Inicio (fuera del canvas, esquina superior izquierda)
        width + diagonalLength * 0.3, height + diagonalLength * 0.3  // Fin (fuera del canvas, esquina inferior derecha)
    )

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
    gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0)`)
    gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.015)`)
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.025)`)
    gradient.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.015)`)
    gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, 0)`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    // Aplicar el gradiente como una capa de brillo sutil y oscuro
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Agregar un segundo destello más sutil y estrecho
    const narrowGradient = ctx.createLinearGradient(
        -diagonalLength * 0.2, -diagonalLength * 0.2,
        width + diagonalLength * 0.2, height + diagonalLength * 0.2
    )

    narrowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
    narrowGradient.addColorStop(0.48, `rgba(${r}, ${g}, ${b}, 0)`)
    narrowGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.02)`)
    narrowGradient.addColorStop(0.52, `rgba(${r}, ${g}, ${b}, 0)`)
    narrowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    ctx.fillStyle = narrowGradient
    ctx.fillRect(0, 0, width, height)

    ctx.restore()
}

// Función para dibujar el logo/escudo del club
const drawClubShield = (ctx, x, y, width, height) => {
    // Dibujar escudo (forma más alargada/ovalada)
    ctx.strokeStyle = GOLD_COLOR
    ctx.lineWidth = strokePx(3)
    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)'

    // Forma de escudo más alargada
    ctx.beginPath()
    ctx.moveTo(x + width / 2, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + height * 0.25)
    ctx.lineTo(x + width, y + height * 0.75)
    ctx.quadraticCurveTo(x + width, y + height, x + width / 2, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height * 0.75)
    ctx.lineTo(x, y + height * 0.25)
    ctx.quadraticCurveTo(x, y, x + width / 2, y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Dibujar target dentro del escudo
    const centerX = x + width / 2
    const centerY = y + height / 2
    const radius = Math.min(width, height) * 0.25

    // Anillos del target
    for (let i = 5; i > 0; i--) {
        ctx.strokeStyle = GOLD_COLOR
        ctx.lineWidth = strokePx(2)
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius * (i / 5), 0, Math.PI * 2)
        ctx.stroke()
    }

    // Números alrededor del target (más distribuidos)
    const numbers = ['6', '7', '9', '10', '9', '7', '6']
    const numberRadius = radius * 1.3
    numbers.forEach((num, index) => {
        const angle = (index * 2 * Math.PI) / numbers.length - Math.PI / 2
        const numX = centerX + Math.cos(angle) * numberRadius
        const numY = centerY + Math.sin(angle) * numberRadius
        ctx.fillStyle = GOLD_COLOR
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(num, numX, numY)
    })

    // Centro del target (bullseye) - rojo
    ctx.fillStyle = '#FF0000'
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.2, 0, Math.PI * 2)
    ctx.fill()

    // Número 10 en el centro (blanco)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('10', centerX, centerY)

    // Texto curvo alrededor del escudo (arco superior)
    ctx.fillStyle = GOLD_COLOR
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'center'

    // Texto en arco superior siguiendo la curva del escudo
    const topTextY = y + 15
    ctx.save()
    ctx.translate(centerX, topTextY)
    ctx.rotate(-0.15)
    ctx.fillText('CLUB DE TIRO', 0, 0)
    ctx.restore()

    // Texto en arco inferior
    const bottomTextY = y + height - 8
    ctx.save()
    ctx.translate(centerX, bottomTextY)
    ctx.rotate(0.15)
    ctx.fillText('DEPORTIVO DEL VALLE', 0, 0)
    ctx.restore()
}

// Generar tarjeta frontal (VERTICAL)
export const generateFrontCard = async (formData) => {
    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH * RENDER_SCALE
    canvas.height = CARD_HEIGHT * RENDER_SCALE
    const ctx = canvas.getContext('2d')
    if (ctx.imageSmoothingQuality !== undefined) {
        ctx.imageSmoothingQuality = 'high'
    }
    ctx.imageSmoothingEnabled = true

    const theme = getCardTheme(formData)
    const isTraumatico = theme.id === 'traumatico'
    useFlatText = isTraumatico

    // Verificar dimensiones
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height, `(VERTICAL · escala ${RENDER_SCALE}×)`)

    // Border radius tipo carnet
    const cardBorderRadius = 25

    ctx.save()
    ctx.scale(RENDER_SCALE, RENDER_SCALE)
    ctx.save()
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, cardBorderRadius)
    ctx.clip()

    // Fondo (tema)
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    if (isTraumatico) {
        drawTraumaticoBackground(ctx, theme)
    }

    // Granulado y destellos solo sobre el fondo (encima van textos, logo y fotos nítidos)
    addGrainEffect(ctx, canvas, isTraumatico ? 0.015 : 0.05, theme.grainAccent)

    // Franja superior distintiva (solo traumático)
    if (theme.stripe) {
        ctx.fillStyle = theme.stripe
        ctx.fillRect(0, 0, CARD_WIDTH, 8)
        ctx.fillRect(0, CARD_HEIGHT - 8, CARD_WIDTH, 8)
    }

    // Padding del carnet
    const padding = 35

    // Top Header Section con padding
    ctx.fillStyle = theme.header
    ctx.font = 'bold 60px Arial'
    ctx.textAlign = 'center'
    drawTextWithShadow(ctx, 'MIEMBRO OFICIAL', CARD_WIDTH / 2, padding + 60, 65, 'Arial', theme.header)

    // Nombre del club
    ctx.font = 'bold 24px Arial'
    drawTextWithShadow(ctx, formData.nombreClub || 'CLUB DE TIRO DEPORTIVO DEL VALLE', CARD_WIDTH / 2, padding + 110, 28, 'Arial', theme.header)

    // Central Logo Section
    const maxLogoHeight = 420
    const maxLogoWidth = 580
    const logoY = padding + 130

    try {
        const logoUrl = typeof logoImage === 'string' ? logoImage : logoImage.default || logoImage
        const logoImg = await loadImage(logoUrl)

        const logoAspectRatio = logoImg.width / logoImg.height
        let logoWidth = maxLogoWidth
        let logoHeight = maxLogoWidth / logoAspectRatio

        if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight
            logoWidth = maxLogoHeight * logoAspectRatio
        }

        const logoX = (CARD_WIDTH - logoWidth) / 2
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight)
    } catch (error) {
        console.error('Error cargando logo:', error)
        const logoX = (CARD_WIDTH - maxLogoWidth) / 2
        drawClubShield(ctx, logoX, logoY, maxLogoWidth, maxLogoHeight)
    }

    const memberInfoY = logoY + maxLogoHeight + 50
    const nombreText = formData.nombre.toUpperCase() || 'NOMBRE'
    const maxNombreWidth = CARD_WIDTH - (padding * 2) - 20
    let nombreFontSize = 60

    ctx.font = `bold ${nombreFontSize}px Arial`
    let textMetrics = ctx.measureText(nombreText)
    while (textMetrics.width > maxNombreWidth && nombreFontSize > 30) {
        nombreFontSize -= 2
        ctx.font = `bold ${nombreFontSize}px Arial`
        textMetrics = ctx.measureText(nombreText)
    }

    ctx.textAlign = 'center'
    drawTextWithShadow(ctx, nombreText, CARD_WIDTH / 2, memberInfoY, nombreFontSize, 'Arial', theme.value, true)

    const frontSubtitle = isTraumatico
        ? 'CÓDIGO DE MIEMBRO'
        : (formData.nivel || 'NIVEL').toUpperCase()
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = theme.accent
    drawTextWithShadow(ctx, frontSubtitle, CARD_WIDTH / 2, memberInfoY + 55, 28, 'Arial', theme.accent)

    ctx.font = 'bold 36px Arial'
    drawTextWithShadow(ctx, formData.numeroMembresia || 'CTDV-0000', CARD_WIDTH / 2, memberInfoY + 105, 36, 'Arial', theme.value, false)

    const lastValueY = CARD_HEIGHT - padding - 10
    const bottomY = lastValueY - 205

    ctx.textAlign = 'left'
    ctx.fillStyle = theme.accent

    // EMISIÓN
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'EMISIÓN:', padding + 10, bottomY, 26, 'Arial', theme.accent)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.emision || 'MM/YYYY', padding + 10, bottomY + 35, 28, 'Arial', theme.value, false)

    // VIGENCIA
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'VIGENCIA:', padding + 10, bottomY + 85, 26, 'Arial', theme.accent)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.vigencia || 'T-XX', padding + 10, bottomY + 120, 28, 'Arial', theme.value, false)

    // RH
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'RH:', padding + 10, bottomY + 170, 26, 'Arial', theme.accent)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.rh || '---', padding + 10, bottomY + 205, 28, 'Arial', theme.value, false)

    ctx.textAlign = 'right'

    // CÉDULA
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'CÉDULA:', CARD_WIDTH - padding - 10, bottomY, 26, 'Arial', theme.accent)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.cedula || '---', CARD_WIDTH - padding - 10, bottomY + 35, 28, 'Arial', theme.value, false)

    // CONTACTO
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'CONTACTO:', CARD_WIDTH - padding - 10, bottomY + 85, 26, 'Arial', theme.accent)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.contacto || '---', CARD_WIDTH - padding - 10, bottomY + 120, 28, 'Arial', theme.value, false)

    // EMERGENCIA
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'EMERGENCIA:', CARD_WIDTH - padding - 10, bottomY + 170, 26, 'Arial', theme.accent)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.contactoEmergencia || '---', CARD_WIDTH - padding - 10, bottomY + 205, 28, 'Arial', theme.value, false)

    ctx.restore()

    ctx.strokeStyle = theme.accent
    ctx.lineWidth = strokePx(isTraumatico ? 3 : 2)
    const borderOffset = 12
    const borderWidth = CARD_WIDTH - (borderOffset * 2)
    const borderHeight = CARD_HEIGHT - (borderOffset * 2)
    const borderCornerRadius = cardBorderRadius - borderOffset
    roundRect(ctx, borderOffset, borderOffset, borderWidth, borderHeight, Math.max(0, borderCornerRadius))
    ctx.stroke()

    // Segundo borde interior (solo traumático) para diferenciarlo del airsoft
    if (isTraumatico) {
        ctx.strokeStyle = theme.value
        ctx.lineWidth = strokePx(1)
        const innerOffset = borderOffset + 6
        roundRect(
            ctx,
            innerOffset,
            innerOffset,
            CARD_WIDTH - innerOffset * 2,
            CARD_HEIGHT - innerOffset * 2,
            Math.max(0, borderCornerRadius - 6)
        )
        ctx.stroke()
    }

    ctx.restore()

    useFlatText = false

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/png')
    })
}

// Generar tarjeta trasera (VERTICAL)
export const generateBackCard = async (formData) => {
    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH * RENDER_SCALE
    canvas.height = CARD_HEIGHT * RENDER_SCALE
    const ctx = canvas.getContext('2d')
    if (ctx.imageSmoothingQuality !== undefined) {
        ctx.imageSmoothingQuality = 'high'
    }
    ctx.imageSmoothingEnabled = true

    const theme = getCardTheme(formData)
    const isTraumatico = theme.id === 'traumatico'
    useFlatText = isTraumatico
    const lightR = theme.grainAccent.r
    const lightG = theme.grainAccent.g
    const lightB = theme.grainAccent.b

    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height, `(VERTICAL · escala ${RENDER_SCALE}×)`)

    // Padding del carnet
    const padding = 35

    // Border radius tipo carnet
    const cardBorderRadius = 25

    ctx.save()
    ctx.scale(RENDER_SCALE, RENDER_SCALE)
    ctx.save()
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, cardBorderRadius)
    ctx.clip()

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    if (isTraumatico) {
        drawTraumaticoBackground(ctx, theme)
    }

    addGrainEffect(ctx, canvas, isTraumatico ? 0.015 : 0.05, theme.grainAccent)

    if (theme.stripe) {
        ctx.fillStyle = theme.stripe
        ctx.fillRect(0, 0, CARD_WIDTH, 8)
        ctx.fillRect(0, CARD_HEIGHT - 8, CARD_WIDTH, 8)
    }

    ctx.restore()

    ctx.strokeStyle = theme.accent
    ctx.lineWidth = strokePx(isTraumatico ? 3 : 2)
    const borderOffset = 12  // Borde más hacia adentro
    const borderWidth = CARD_WIDTH - (borderOffset * 2)
    const borderHeight = CARD_HEIGHT - (borderOffset * 2)
    const borderCornerRadius = cardBorderRadius - borderOffset  // Ajustar el radius del borde
    roundRect(ctx, borderOffset, borderOffset, borderWidth, borderHeight, Math.max(0, borderCornerRadius))
    ctx.stroke()

    if (isTraumatico) {
        ctx.strokeStyle = theme.value
        ctx.lineWidth = strokePx(1)
        const innerOffset = borderOffset + 6
        roundRect(
            ctx,
            innerOffset,
            innerOffset,
            CARD_WIDTH - innerOffset * 2,
            CARD_HEIGHT - innerOffset * 2,
            Math.max(0, borderCornerRadius - 6)
        )
        ctx.stroke()
    }

    // Top Section - Identificador (airsoft) o título de disciplina (traumático)
    const backHeader = isTraumatico
        ? 'INFORMACIÓN'
        : (formData.identificador || 'IDENTIFICADOR').toUpperCase()
    ctx.fillStyle = theme.header
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    // Ajustar tamaño si el título es largo
    let backHeaderSize = 48
    ctx.font = `bold ${backHeaderSize}px Arial`
    while (ctx.measureText(backHeader).width > CARD_WIDTH - padding * 2 - 20 && backHeaderSize > 26) {
        backHeaderSize -= 2
        ctx.font = `bold ${backHeaderSize}px Arial`
    }
    drawTextWithShadow(ctx, backHeader, CARD_WIDTH / 2, padding + 55, backHeaderSize, 'Arial', theme.header)

    // Línea divisoria debajo del identificador
    const lineIdentificadorY = padding + 90
    ctx.strokeStyle = theme.divider
    ctx.lineWidth = strokePx(1.5)
    ctx.beginPath()
    ctx.moveTo(padding + 10, lineIdentificadorY)
    ctx.lineTo(CARD_WIDTH - padding - 10, lineIdentificadorY)
    ctx.stroke()

    // Foto del miembro (a la izquierda, cuadrada)
    let photoImg = null
    if (formData.foto) {
        try {
            const photoUrl = URL.createObjectURL(formData.foto)
            photoImg = await loadImage(photoUrl)
            URL.revokeObjectURL(photoUrl)
        } catch (error) {
            console.error('Error cargando foto:', error)
        }
    }

    // Foto: un poco menos ancha y mucho más larga
    const photoHeight = Math.floor(CARD_HEIGHT * 0.35)  // Más larga = ~351px
    const photoWidth = Math.floor(CARD_WIDTH * 0.40)  // Menos ancha = 260px
    const photoX = padding + 10
    const photoY = lineIdentificadorY + 25  // Margen después de la línea divisoria (ajustado)

    // Radio para border radius
    const borderRadius = 8

    if (photoImg) {
        // Crear path con border radius para la foto
        ctx.save()
        roundRect(ctx, photoX, photoY, photoWidth, photoHeight, borderRadius)
        ctx.clip()

        // Dibujar foto dentro del área recortada
        ctx.drawImage(photoImg, photoX, photoY, photoWidth, photoHeight)
        ctx.restore()

        // Crear efecto de sombra interna (incrustada) - sombras más delgadas
        // Luz viene desde arriba-izquierda, sombras en arriba y derecha, luz en izquierda y abajo

        // Sombra superior (arriba) - oscura y delgada
        const shadowTop = ctx.createLinearGradient(photoX, photoY, photoX, photoY + 10)
        shadowTop.addColorStop(0, 'rgba(0, 0, 0, 0.7)')
        shadowTop.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = shadowTop
        roundRect(ctx, photoX, photoY, photoWidth, 10, borderRadius)
        ctx.fill()

        // Sombra derecha - oscura y delgada
        const shadowRight = ctx.createLinearGradient(photoX + photoWidth - 10, photoY, photoX + photoWidth, photoY)
        shadowRight.addColorStop(0, 'rgba(0, 0, 0, 0)')
        shadowRight.addColorStop(1, 'rgba(0, 0, 0, 0.7)')
        ctx.fillStyle = shadowRight
        roundRect(ctx, photoX + photoWidth - 10, photoY, 10, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de luz izquierda - más delgada
        const lightLeft = ctx.createLinearGradient(photoX, photoY, photoX + 7, photoY)
        lightLeft.addColorStop(0, `rgba(${lightR}, ${lightG}, ${lightB}, 0.3)`)
        lightLeft.addColorStop(1, `rgba(${lightR}, ${lightG}, ${lightB}, 0)`)
        ctx.fillStyle = lightLeft
        roundRect(ctx, photoX, photoY, 7, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de luz abajo - más delgada
        const lightBottom = ctx.createLinearGradient(photoX, photoY + photoHeight - 7, photoX, photoY + photoHeight)
        lightBottom.addColorStop(0, `rgba(${lightR}, ${lightG}, ${lightB}, 0)`)
        lightBottom.addColorStop(1, `rgba(${lightR}, ${lightG}, ${lightB}, 0.3)`)
        ctx.fillStyle = lightBottom
        roundRect(ctx, photoX, photoY + photoHeight - 7, photoWidth, 7, borderRadius)
        ctx.fill()

        // Borde sutil interno para definir mejor el efecto
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.lineWidth = strokePx(1)
        roundRect(ctx, photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2, borderRadius - 1)
        ctx.stroke()
    } else {
        // Placeholder si no hay foto
        ctx.fillStyle = isTraumatico ? '#2a2620' : '#333333'
        roundRect(ctx, photoX, photoY, photoWidth, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de sombra interna para placeholder también - sombras más delgadas
        // Sombra superior (arriba) - oscura y delgada
        const shadowTop = ctx.createLinearGradient(photoX, photoY, photoX, photoY + 10)
        shadowTop.addColorStop(0, 'rgba(0, 0, 0, 0.7)')
        shadowTop.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = shadowTop
        roundRect(ctx, photoX, photoY, photoWidth, 10, borderRadius)
        ctx.fill()

        // Sombra derecha - oscura y delgada
        const shadowRight = ctx.createLinearGradient(photoX + photoWidth - 10, photoY, photoX + photoWidth, photoY)
        shadowRight.addColorStop(0, 'rgba(0, 0, 0, 0)')
        shadowRight.addColorStop(1, 'rgba(0, 0, 0, 0.7)')
        ctx.fillStyle = shadowRight
        roundRect(ctx, photoX + photoWidth - 10, photoY, 10, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de luz izquierda - más delgada
        const lightLeft = ctx.createLinearGradient(photoX, photoY, photoX + 7, photoY)
        lightLeft.addColorStop(0, `rgba(${lightR}, ${lightG}, ${lightB}, 0.3)`)
        lightLeft.addColorStop(1, `rgba(${lightR}, ${lightG}, ${lightB}, 0)`)
        ctx.fillStyle = lightLeft
        roundRect(ctx, photoX, photoY, 7, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de luz abajo - más delgada
        const lightBottom = ctx.createLinearGradient(photoX, photoY + photoHeight - 7, photoX, photoY + photoHeight)
        lightBottom.addColorStop(0, `rgba(${lightR}, ${lightG}, ${lightB}, 0)`)
        lightBottom.addColorStop(1, `rgba(${lightR}, ${lightG}, ${lightB}, 0.3)`)
        ctx.fillStyle = lightBottom
        roundRect(ctx, photoX, photoY + photoHeight - 7, photoWidth, 7, borderRadius)
        ctx.fill()

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.lineWidth = strokePx(1)
        roundRect(ctx, photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2, borderRadius - 1)
        ctx.stroke()

        ctx.fillStyle = theme.accent
        ctx.font = '20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('FOTO', photoX + photoWidth / 2, photoY + photoHeight / 2)
    }

    const disciplinaValor = (formData.disciplina || (isTraumatico ? 'BAJA LETALIDAD' : 'AIRSOFT')).toUpperCase()

    // Right Column - Información a la derecha de la foto
    const infoX = photoX + photoWidth + 25
    let infoY = photoY + 10

    ctx.textAlign = 'left'

    if (isTraumatico) {
        // DISCIPLINA (fija: BAJA LETALIDAD)
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'DISCIPLINA', infoX, infoY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 24px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, disciplinaValor, infoX, infoY + 42, 24, 'Arial', theme.value, false)

        const lineDiscY = infoY + 72
        ctx.strokeStyle = theme.divider
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(infoX, lineDiscY)
        ctx.lineTo(CARD_WIDTH - padding - 5, lineDiscY)
        ctx.stroke()

        // TIPO (fijo: TRAUMÁTICA)
        infoY = lineDiscY + 32
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'TIPO', infoX, infoY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 24px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(
            ctx,
            (formData.tipo || 'TRAUMÁTICA').toUpperCase(),
            infoX,
            infoY + 42,
            24,
            'Arial',
            theme.value,
            false
        )

        const lineTipoY = infoY + 72
        ctx.strokeStyle = theme.divider
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(infoX, lineTipoY)
        ctx.lineTo(CARD_WIDTH - padding - 5, lineTipoY)
        ctx.stroke()
    } else {
        // ESPECIALIDAD
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'ESPECIALIDAD', infoX, infoY, 26, 'Arial', theme.accent)

        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, (formData.especialidad || 'ESPECIALIDAD').toUpperCase(), infoX, infoY + 50, 28, 'Arial', theme.value, false)

        const lineEspY = infoY + 90
        ctx.strokeStyle = theme.divider
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(infoX, lineEspY)
        ctx.lineTo(CARD_WIDTH - padding - 5, lineEspY)
        ctx.stroke()

        // NIVEL
        infoY = lineEspY + 35
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'NIVEL', infoX, infoY, 26, 'Arial', theme.accent)

        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, (formData.nivel || 'NIVEL').toUpperCase(), infoX, infoY + 50, 28, 'Arial', theme.value, false)

        const lineNivelY = infoY + 90
        ctx.strokeStyle = theme.divider
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(infoX, lineNivelY)
        ctx.lineTo(CARD_WIDTH - padding - 5, lineNivelY)
        ctx.stroke()

        // DISCIPLINA
        infoY = lineNivelY + 35
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'DISCIPLINA', infoX, infoY, 26, 'Arial', theme.accent)

        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, disciplinaValor, infoX, infoY + 50, 28, 'Arial', theme.value, false)

        const lineDisciplinaY = infoY + 90
        ctx.strokeStyle = theme.divider
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(infoX, lineDisciplinaY)
        ctx.lineTo(CARD_WIDTH - padding - 5, lineDisciplinaY)
        ctx.stroke()
    }

    // Línea divisoria después de la foto
    const weaponsY = photoY + photoHeight + 30
    ctx.strokeStyle = theme.divider
    ctx.lineWidth = strokePx(1.5)
    ctx.beginPath()
    ctx.moveTo(photoX, weaponsY)
    ctx.lineTo(CARD_WIDTH - padding - 5, weaponsY)
    ctx.stroke()

    const teamX = photoX

    if (isTraumatico) {
        // MARCA / CALIBRE / A/N
        const armaSectionY = weaponsY + 40
        ctx.textAlign = 'left'
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'MARCA', photoX, armaSectionY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(
            ctx,
            (formData.marca || formData.arma || '---').toUpperCase(),
            photoX,
            armaSectionY + 42,
            28,
            'Arial',
            theme.value,
            false
        )

        const calibreY = armaSectionY + 95
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'CALIBRE', photoX, calibreY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(
            ctx,
            (formData.calibre || '---').toUpperCase(),
            photoX,
            calibreY + 42,
            28,
            'Arial',
            theme.value,
            false
        )

        const anY = calibreY + 95
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'A/N', photoX, anY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(
            ctx,
            (formData.an || '---').toUpperCase(),
            photoX,
            anY + 42,
            28,
            'Arial',
            theme.value,
            false
        )
    } else {
        // EQUIPO TÁCTICO - pistola / fusil
        const equipoTacticoY = weaponsY + 40
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'EQUIPO TÁCTICO', photoX, equipoTacticoY, 26, 'Arial', theme.accent)

        const weaponsTextY = equipoTacticoY + 50
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, `PISTOLA: ${(formData.pistola || 'MODELO').toUpperCase()}`, photoX, weaponsTextY, 28, 'Arial', theme.value, false)
        drawTextWithShadow(ctx, `FUSIL: ${(formData.fusil || 'MODELO').toUpperCase()}`, photoX, weaponsTextY + 40, 28, 'Arial', theme.value, false)

        const line1Y = weaponsTextY + 75
        ctx.strokeStyle = theme.divider
        ctx.lineWidth = strokePx(1.5)
        ctx.beginPath()
        ctx.moveTo(photoX, line1Y)
        ctx.lineTo(CARD_WIDTH - padding - 5, line1Y)
        ctx.stroke()

        const teamY = line1Y + 40
        const rolX = CARD_WIDTH - padding - 5

        ctx.textAlign = 'left'
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'EQUIPO', teamX, teamY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, (formData.equipoTactico || 'N/A').toUpperCase(), teamX, teamY + 40, 28, 'Arial', theme.value, false)

        ctx.textAlign = 'right'
        ctx.font = 'bold 26px Arial'
        ctx.fillStyle = theme.accent
        drawTextWithShadow(ctx, 'ROL', rolX, teamY, 26, 'Arial', theme.accent)
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = theme.value
        drawTextWithShadow(ctx, (formData.rolEnEquipo || 'N/A').toUpperCase(), rolX, teamY + 40, 28, 'Arial', theme.value, false)
    }

    // QR Code (abajo a la derecha)
    const qrSize = 100
    const qrPadding = 5
    const qrBorderWidth = 2
    const qrX = CARD_WIDTH - qrSize - qrPadding * 2 - qrBorderWidth * 2 - padding - 5
    const qrY = CARD_HEIGHT - qrSize - qrPadding * 2 - qrBorderWidth * 2 - padding - 5

    const qrBgX = qrX - qrPadding - qrBorderWidth
    const availLogoWidth = Math.max(72, qrBgX - teamX - 12)

    // Logo del equipo (solo airsoft)
    if (!isTraumatico && formData.equipoLogo) {
        try {
            const logoImg = await loadImage(formData.equipoLogo)
            const logoSize = Math.min(TEAM_LOGO_MAX_SIDE, availLogoWidth)
            const logoX = teamX
            const logoAspectRatio = logoImg.width / logoImg.height
            let logoWidth = logoSize
            let logoHeight = logoSize / logoAspectRatio

            if (logoHeight > logoSize) {
                logoHeight = logoSize
                logoWidth = logoSize * logoAspectRatio
            }

            const logoY = qrY + (qrSize / 2) - (logoHeight / 2)
            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight)
        } catch (error) {
            console.error('Error cargando logo del equipo:', error)
        }
    }

    // Generar y dibujar el QR Code
    try {
        // Generar URL para el QR code que redirige a la vista de credencial
        // Intentar obtener la URL base desde el entorno o usar window.location.origin
        let baseUrl = ''
        if (typeof window !== 'undefined' && window.location) {
            baseUrl = window.location.origin
        } else if (typeof process !== 'undefined' && process.env.VITE_APP_URL) {
            baseUrl = process.env.VITE_APP_URL
        }

        // URL del QR: incluye tipo para no confundir airsoft vs traumático
        const tipoQr =
            formData.tipoCarnet === 'traumatico' ? 'traumatico' : 'airsoft'
        const cedulaQr = encodeURIComponent(String(formData.cedula || '').trim())
        const qrData = baseUrl
            ? `${baseUrl}/credencial/${cedulaQr}?tipo=${tipoQr}`
            : `/credencial/${cedulaQr}?tipo=${tipoQr}`

        const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 200 * RENDER_SCALE,
            margin: 2,
            color: {
                dark: '#000000',
                light: theme.qrLight
            },
            errorCorrectionLevel: 'M'
        })

        const qrImg = await loadImage(qrDataUrl)

        // Sombra muy ligera (blur alto suaviza bordes del QR y del recuadro)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
        ctx.shadowBlur = 2
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1

        // Fondo beige/arena con borde redondeado para el QR
        const qrBgX = qrX - qrPadding - qrBorderWidth
        const qrBgY = qrY - qrPadding - qrBorderWidth
        const qrBgSize = qrSize + (qrPadding * 2) + (qrBorderWidth * 2)

        // Fondo beige/arena claro (similar al color #af9974 pero más claro)
        ctx.fillStyle = theme.qrLight
        roundRect(ctx, qrBgX, qrBgY, qrBgSize, qrBgSize, 8)
        ctx.fill()

        // Borde dorado
        ctx.strokeStyle = theme.accent
        ctx.lineWidth = strokePx(qrBorderWidth)
        roundRect(ctx, qrBgX, qrBgY, qrBgSize, qrBgSize, 8)
        ctx.stroke()

        // Resetear sombra
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Dibujar el QR code
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    } catch (error) {
        console.error('Error generando QR:', error)
    }

    ctx.restore()

    useFlatText = false

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/png')
    })
}

