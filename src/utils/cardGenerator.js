import QRCode from 'qrcode'
import logoImage from '../assets/logo.png'

// Dimensiones para tarjeta de identificación VERTICAL
// 5.5 cm (ancho) x 8.5 cm (alto) a 300 DPI
// 5.5 cm = 55 mm = 55 * 300 / 25.4 = 649.61 px ≈ 650 px
// 8.5 cm = 85 mm = 85 * 300 / 25.4 = 1003.94 px ≈ 1004 px
const CARD_WIDTH = 650   // 5.5 cm (ancho)
const CARD_HEIGHT = 1004 // 8.5 cm (alto) - VERTICAL (más alto que ancho)
const GOLD_COLOR = '#826030'
const GOLD_COLOR_LIGHT = '#D4AF37'
const DARK_BG = '#151311'  // Fondo oscuro gris café, más cerca del negro

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

// Función para dibujar texto con efecto metalizado
const drawTextWithShadow = (ctx, text, x, y, fontSize, fontFamily = 'Arial', color = GOLD_COLOR) => {
    ctx.font = `bold ${fontSize}px ${fontFamily}`

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
    if (color === '#af9974' || color === '#E8E8E8') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
        ctx.fillText(text, x + 1, y + 1)
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillText(text, x + 2, y + 2)
    }

    // Dibujar texto con efecto metalizado
    ctx.fillStyle = gradient
    ctx.fillText(text, x, y)

    // Agregar un resplandor muy sutil para aumentar el efecto metálico sin blanquear
    ctx.shadowColor = `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.15)`
    ctx.shadowBlur = 1
    ctx.fillText(text, x, y)
    ctx.shadowBlur = 0  // Resetear sombra
}

// Función para agregar efecto granulado/ruido con destello diagonal
const addGrainEffect = (ctx, width, height, intensity = 0.05) => {
    // Obtener los datos de la imagen actual del canvas
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

    // Agregar efecto de destello diagonal (de esquina superior izquierda a inferior derecha)
    // Usando los tonos del carnet (dorado/brass) y muy sutil
    ctx.save()

    // Calcular la diagonal
    const diagonalLength = Math.sqrt(width * width + height * height)

    // Crear gradiente lineal diagonal con tonos dorados del carnet
    const gradient = ctx.createLinearGradient(
        -diagonalLength * 0.3, -diagonalLength * 0.3,  // Inicio (fuera del canvas, esquina superior izquierda)
        width + diagonalLength * 0.3, height + diagonalLength * 0.3  // Fin (fuera del canvas, esquina inferior derecha)
    )

    // Gradiente con tonos dorados del carnet, muy sutil y oscuro
    // Usando tonos más oscuros del dorado con opacidad muy baja
    gradient.addColorStop(0, 'rgba(130, 96, 48, 0)')      // Transparente al inicio (dorado oscuro #826030)
    gradient.addColorStop(0.35, 'rgba(130, 96, 48, 0)')   // Transparente antes del centro
    gradient.addColorStop(0.45, 'rgba(130, 96, 48, 0.015)') // Brillo muy sutil y oscuro
    gradient.addColorStop(0.5, 'rgba(130, 96, 48, 0.025)')  // Pico de brillo muy sutil en el centro
    gradient.addColorStop(0.55, 'rgba(130, 96, 48, 0.015)') // Brillo muy sutil y oscuro
    gradient.addColorStop(0.65, 'rgba(130, 96, 48, 0)')   // Transparente después del centro
    gradient.addColorStop(1, 'rgba(130, 96, 48, 0)')      // Transparente al final

    // Aplicar el gradiente como una capa de brillo sutil y oscuro
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Agregar un segundo destello más sutil y estrecho con tono brass oscuro
    const narrowGradient = ctx.createLinearGradient(
        -diagonalLength * 0.2, -diagonalLength * 0.2,
        width + diagonalLength * 0.2, height + diagonalLength * 0.2
    )

    narrowGradient.addColorStop(0, 'rgba(130, 96, 48, 0)')
    narrowGradient.addColorStop(0.48, 'rgba(130, 96, 48, 0)')
    narrowGradient.addColorStop(0.5, 'rgba(130, 96, 48, 0.02)')  // Línea de brillo muy sutil y oscuro
    narrowGradient.addColorStop(0.52, 'rgba(130, 96, 48, 0)')
    narrowGradient.addColorStop(1, 'rgba(130, 96, 48, 0)')

    ctx.fillStyle = narrowGradient
    ctx.fillRect(0, 0, width, height)

    ctx.restore()
}

// Función para dibujar el logo/escudo del club
const drawClubShield = (ctx, x, y, width, height) => {
    // Dibujar escudo (forma más alargada/ovalada)
    ctx.strokeStyle = GOLD_COLOR
    ctx.lineWidth = 3
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
        ctx.lineWidth = 2
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
    // Asegurar que el canvas sea VERTICAL (más alto que ancho)
    canvas.width = CARD_WIDTH  // 650px = 5.5 cm (ancho)
    canvas.height = CARD_HEIGHT // 1004px = 8.5 cm (alto) - VERTICAL
    const ctx = canvas.getContext('2d')

    // Verificar dimensiones
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height, '(VERTICAL - 5.5cm x 8.5cm)')

    // Border radius tipo carnet
    const cardBorderRadius = 25

    // Recortar el canvas con border radius para que todo respete las esquinas redondeadas
    ctx.save()
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, cardBorderRadius)
    ctx.clip()

    // Fondo oscuro
    ctx.fillStyle = DARK_BG
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    // Padding del carnet
    const padding = 35

    // Top Header Section con padding
    // Título superior - MUCHO más grande y prominente
    ctx.fillStyle = '#b08449'
    ctx.font = 'bold 60px Arial'
    ctx.textAlign = 'center'
    drawTextWithShadow(ctx, 'MIEMBRO OFICIAL', CARD_WIDTH / 2, padding + 60, 65, 'Arial', '#b08449')

    // Nombre del club - más grande
    ctx.font = 'bold 24px Arial'
    drawTextWithShadow(ctx, formData.nombreClub || 'CLUB DE TIRO DEPORTIVO DEL VALLE', CARD_WIDTH / 2, padding + 110, 28, 'Arial', '#b08449')

    // Central Logo Section - Logo MUCHO más grande
    // Logo más grande para ocupar más espacio
    const maxLogoHeight = 420  // Mucho más grande
    const maxLogoWidth = 580   // Más ancho, casi todo el ancho disponible
    const logoY = padding + 130  // Después del header con padding

    try {
        // Vite devuelve la URL de la imagen al importarla
        const logoUrl = typeof logoImage === 'string' ? logoImage : logoImage.default || logoImage
        const logoImg = await loadImage(logoUrl)

        // Calcular dimensiones manteniendo la proporción original
        const logoAspectRatio = logoImg.width / logoImg.height
        let logoWidth = maxLogoWidth
        let logoHeight = maxLogoWidth / logoAspectRatio

        // Si la altura calculada excede el máximo, ajustar por altura
        if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight
            logoWidth = maxLogoHeight * logoAspectRatio
        }

        // Centrar el logo horizontalmente
        const logoX = (CARD_WIDTH - logoWidth) / 2

        // Dibujar el logo manteniendo la proporción original
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight)
    } catch (error) {
        console.error('Error cargando logo:', error)
        // Fallback: dibujar escudo si no se puede cargar la imagen
        const logoX = (CARD_WIDTH - maxLogoWidth) / 2
        drawClubShield(ctx, logoX, logoY, maxLogoWidth, maxLogoHeight)
    }

    // Member Information Section - Letras más grandes con MÁS separación del logo
    // Nombre del miembro - MUCHO más grande y en color #af9974
    // Ajustar tamaño de fuente si el nombre es muy largo
    const memberInfoY = logoY + maxLogoHeight + 50  // Más separación (antes 35)
    const nombreText = formData.nombre.toUpperCase() || 'NOMBRE'
    const maxNombreWidth = CARD_WIDTH - (padding * 2) - 20  // Ancho disponible menos padding y margen
    let nombreFontSize = 60  // Tamaño inicial

    // Ajustar tamaño de fuente si el nombre es muy largo
    ctx.font = `bold ${nombreFontSize}px Arial`
    let textMetrics = ctx.measureText(nombreText)
    while (textMetrics.width > maxNombreWidth && nombreFontSize > 30) {
        nombreFontSize -= 2
        ctx.font = `bold ${nombreFontSize}px Arial`
        textMetrics = ctx.measureText(nombreText)
    }

    ctx.textAlign = 'center'
    drawTextWithShadow(ctx, nombreText, CARD_WIDTH / 2, memberInfoY, nombreFontSize, 'Arial', '#af9974')

    // Nivel/Operador - tamaño mediano más grande
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, formData.nivel.toUpperCase() || 'NIVEL', CARD_WIDTH / 2, memberInfoY + 55, 28)

    // Número de membresía - tamaño mediano-grande en color #af9974
    ctx.font = 'bold 36px Arial'
    drawTextWithShadow(ctx, formData.numeroMembresia || 'CTDV-0000', CARD_WIDTH / 2, memberInfoY + 105, 36, 'Arial', '#af9974')

    // Bottom Details Section - Todo en columna, letras MUCHO más grandes
    // Calcular bottomY para que los últimos elementos lleguen hasta el final respetando el padding
    // El último valor está en bottomY + 205, debe estar cerca de CARD_HEIGHT - padding
    const lastValueY = CARD_HEIGHT - padding - 10  // 10px de margen antes del padding
    const bottomY = lastValueY - 205  // Retroceder 205px desde el último valor

    ctx.textAlign = 'left'
    ctx.fillStyle = GOLD_COLOR

    // Columna izquierda - EMISIÓN, VIGENCIA y RH
    ctx.textAlign = 'left'

    // EMISIÓN (primera)
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'EMISIÓN:', padding + 10, bottomY, 26)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.emision || 'MM/YYYY', padding + 10, bottomY + 35, 28, 'Arial', '#af9974')

    // VIGENCIA
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'VIGENCIA:', padding + 10, bottomY + 85, 26)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.vigencia || 'T-XX', padding + 10, bottomY + 120, 28, 'Arial', '#af9974')

    // RH (último dato del lado izquierdo, debajo de VIGENCIA)
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'RH:', padding + 10, bottomY + 170, 26)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.rh || '---', padding + 10, bottomY + 205, 28, 'Arial', '#af9974')

    // Columna derecha - CÉDULA, CONTACTO y EMERGENCIA
    ctx.textAlign = 'right'

    // CÉDULA (primera)
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'CÉDULA:', CARD_WIDTH - padding - 10, bottomY, 26)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.cedula || '---', CARD_WIDTH - padding - 10, bottomY + 35, 28, 'Arial', '#af9974')

    // CONTACTO
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'CONTACTO:', CARD_WIDTH - padding - 10, bottomY + 85, 26)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.contacto || '---', CARD_WIDTH - padding - 10, bottomY + 120, 28, 'Arial', '#af9974')

    // CONTACTO DE EMERGENCIA (último)
    ctx.font = 'bold 26px Arial'
    drawTextWithShadow(ctx, 'EMERGENCIA:', CARD_WIDTH - padding - 10, bottomY + 170, 26)
    ctx.font = 'bold 28px Arial'
    drawTextWithShadow(ctx, formData.contactoEmergencia || '---', CARD_WIDTH - padding - 10, bottomY + 205, 28, 'Arial', '#af9974')

    // Restaurar el contexto (quitar el clip) antes del granulado y el borde
    ctx.restore()

    // Aplicar efecto granulado
    addGrainEffect(ctx, CARD_WIDTH, CARD_HEIGHT, 0.05)

    // Bordes redondeados - más hacia adentro con border radius
    ctx.strokeStyle = GOLD_COLOR
    ctx.lineWidth = 2  // Borde más delgado (la mitad de 4)
    const borderOffset = 12  // Borde más hacia adentro
    const borderWidth = CARD_WIDTH - (borderOffset * 2)
    const borderHeight = CARD_HEIGHT - (borderOffset * 2)
    const borderCornerRadius = cardBorderRadius - borderOffset  // Ajustar el radius del borde
    roundRect(ctx, borderOffset, borderOffset, borderWidth, borderHeight, Math.max(0, borderCornerRadius))
    ctx.stroke()

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/png')
    })
}

// Generar tarjeta trasera (VERTICAL)
export const generateBackCard = async (formData) => {
    const canvas = document.createElement('canvas')
    // Asegurar que el canvas sea VERTICAL (más alto que ancho)
    canvas.width = CARD_WIDTH  // 650px = 5.5 cm (ancho)
    canvas.height = CARD_HEIGHT // 1004px = 8.5 cm (alto) - VERTICAL
    const ctx = canvas.getContext('2d')

    // Verificar dimensiones
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height, '(VERTICAL - 5.5cm x 8.5cm)')

    // Padding del carnet
    const padding = 35

    // Border radius tipo carnet
    const cardBorderRadius = 25

    // Recortar el canvas con border radius para que todo respete las esquinas redondeadas
    ctx.save()
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, cardBorderRadius)
    ctx.clip()

    // Fondo oscuro
    ctx.fillStyle = DARK_BG
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
    ctx.restore()

    // Bordes redondeados - más hacia adentro con border radius
    ctx.strokeStyle = GOLD_COLOR
    ctx.lineWidth = 2  // Borde más delgado (la mitad de 4)
    const borderOffset = 12  // Borde más hacia adentro
    const borderWidth = CARD_WIDTH - (borderOffset * 2)
    const borderHeight = CARD_HEIGHT - (borderOffset * 2)
    const borderCornerRadius = cardBorderRadius - borderOffset  // Ajustar el radius del borde
    roundRect(ctx, borderOffset, borderOffset, borderWidth, borderHeight, Math.max(0, borderCornerRadius))
    ctx.stroke()

    // Top Section - Identificador superior (centrado, más abajo para dar espacio arriba)
    ctx.fillStyle = '#b08449'  // Mismo color que "MIEMBRO OFICIAL"
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    drawTextWithShadow(ctx, formData.identificador.toUpperCase() || 'IDENTIFICADOR', CARD_WIDTH / 2, padding + 55, 48, 'Arial', '#b08449')

    // Línea divisoria debajo del identificador
    const lineIdentificadorY = padding + 90
    ctx.strokeStyle = '#af9974'
    ctx.lineWidth = 1.5
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

        // Efecto de luz izquierda (color #af9974) - más delgada
        const lightLeft = ctx.createLinearGradient(photoX, photoY, photoX + 7, photoY)
        lightLeft.addColorStop(0, 'rgba(175, 153, 116, 0.3)')
        lightLeft.addColorStop(1, 'rgba(175, 153, 116, 0)')
        ctx.fillStyle = lightLeft
        roundRect(ctx, photoX, photoY, 7, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de luz abajo (color #af9974) - más delgada
        const lightBottom = ctx.createLinearGradient(photoX, photoY + photoHeight - 7, photoX, photoY + photoHeight)
        lightBottom.addColorStop(0, 'rgba(175, 153, 116, 0)')
        lightBottom.addColorStop(1, 'rgba(175, 153, 116, 0.3)')
        ctx.fillStyle = lightBottom
        roundRect(ctx, photoX, photoY + photoHeight - 7, photoWidth, 7, borderRadius)
        ctx.fill()

        // Borde sutil interno para definir mejor el efecto
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.lineWidth = 1
        roundRect(ctx, photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2, borderRadius - 1)
        ctx.stroke()
    } else {
        // Placeholder si no hay foto
        ctx.fillStyle = '#333333'
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

        // Efecto de luz izquierda (color #af9974) - más delgada
        const lightLeft = ctx.createLinearGradient(photoX, photoY, photoX + 7, photoY)
        lightLeft.addColorStop(0, 'rgba(175, 153, 116, 0.3)')
        lightLeft.addColorStop(1, 'rgba(175, 153, 116, 0)')
        ctx.fillStyle = lightLeft
        roundRect(ctx, photoX, photoY, 7, photoHeight, borderRadius)
        ctx.fill()

        // Efecto de luz abajo (color #af9974) - más delgada
        const lightBottom = ctx.createLinearGradient(photoX, photoY + photoHeight - 7, photoX, photoY + photoHeight)
        lightBottom.addColorStop(0, 'rgba(175, 153, 116, 0)')
        lightBottom.addColorStop(1, 'rgba(175, 153, 116, 0.3)')
        ctx.fillStyle = lightBottom
        roundRect(ctx, photoX, photoY + photoHeight - 7, photoWidth, 7, borderRadius)
        ctx.fill()

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.lineWidth = 1
        roundRect(ctx, photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2, borderRadius - 1)
        ctx.stroke()

        ctx.fillStyle = GOLD_COLOR
        ctx.font = '20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('FOTO', photoX + photoWidth / 2, photoY + photoHeight / 2)
    }

    // Right Column - Información a la derecha de la foto
    const infoX = photoX + photoWidth + 25
    let infoY = photoY + 10

    ctx.textAlign = 'left'

    // ESPECIALIDAD
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, 'ESPECIALIDAD', infoX, infoY, 26)

    // Valor de ESPECIALIDAD
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#af9974'
    drawTextWithShadow(ctx, formData.especialidad.toUpperCase() || 'ESPECIALIDAD', infoX, infoY + 50, 28, 'Arial', '#af9974')

    // Línea divisoria después del valor de ESPECIALIDAD
    const lineEspY = infoY + 90
    ctx.strokeStyle = '#af9974'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(infoX, lineEspY)
    ctx.lineTo(CARD_WIDTH - padding - 5, lineEspY)
    ctx.stroke()

    // NIVEL (con más padding)
    infoY = lineEspY + 35  // Más padding entre secciones
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, 'NIVEL', infoX, infoY, 26)

    // Valor de NIVEL
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#af9974'
    drawTextWithShadow(ctx, formData.nivel.toUpperCase() || 'NIVEL', infoX, infoY + 50, 28, 'Arial', '#af9974')

    // Línea divisoria después del valor de NIVEL
    const lineNivelY = infoY + 90
    ctx.strokeStyle = '#af9974'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(infoX, lineNivelY)
    ctx.lineTo(CARD_WIDTH - padding - 5, lineNivelY)
    ctx.stroke()

    // DISCIPLINA (con más padding después de NIVEL)
    infoY = lineNivelY + 35  // Más padding entre secciones
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, 'DISCIPLINA', infoX, infoY, 26)

    // Valor de DISCIPLINA
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#af9974'
    drawTextWithShadow(ctx, 'AIRSOFT', infoX, infoY + 50, 28, 'Arial', '#af9974')

    // Línea divisoria después del valor de DISCIPLINA
    const lineDisciplinaY = infoY + 90
    ctx.strokeStyle = '#af9974'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(infoX, lineDisciplinaY)
    ctx.lineTo(CARD_WIDTH - padding - 5, lineDisciplinaY)
    ctx.stroke()

    // Línea divisoria después de la foto (antes de EQUIPO TÁCTICO) - con más padding
    const weaponsY = photoY + photoHeight + 30  // Más padding
    ctx.strokeStyle = '#af9974'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(photoX, weaponsY)
    ctx.lineTo(CARD_WIDTH - padding - 5, weaponsY)
    ctx.stroke()

    // EQUIPO TÁCTICO - Título de la sección de armas
    const equipoTacticoY = weaponsY + 40  // Más padding arriba del título (después de la línea)
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, 'EQUIPO TÁCTICO', photoX, equipoTacticoY, 26)

    // PISTOLA (valor del equipo táctico)
    const weaponsTextY = equipoTacticoY + 50  // Padding después del título
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#af9974'
    drawTextWithShadow(ctx, `PISTOLA: ${formData.pistola.toUpperCase() || 'MODELO'}`, photoX, weaponsTextY, 28, 'Arial', '#af9974')

    // FUSIL (valor del equipo táctico)
    drawTextWithShadow(ctx, `FUSIL: ${formData.fusil.toUpperCase() || 'MODELO'}`, photoX, weaponsTextY + 40, 28, 'Arial', '#af9974')

    // Línea divisoria después de armas
    const line1Y = weaponsTextY + 75  // Más padding
    ctx.strokeStyle = '#af9974'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(photoX, line1Y)
    ctx.lineTo(CARD_WIDTH - padding - 5, line1Y)
    ctx.stroke()

    // Lower Mid-Section - Equipo y Rol (lado a lado)
    const teamY = line1Y + 40  // Más padding arriba del texto (después de la línea)
    const teamX = photoX
    const rolX = CARD_WIDTH - padding - 5  // Alineado a la derecha

    // EQUIPO (izquierda)
    ctx.textAlign = 'left'
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, 'EQUIPO', teamX, teamY, 26)
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#af9974'
    drawTextWithShadow(ctx, (formData.equipoTactico || 'N/A').toUpperCase(), teamX, teamY + 40, 28, 'Arial', '#af9974')

    // ROL EN EL EQUIPO (derecha, nivelado con EQUIPO)
    ctx.textAlign = 'right'
    ctx.font = 'bold 26px Arial'
    ctx.fillStyle = GOLD_COLOR
    drawTextWithShadow(ctx, 'ROL', rolX, teamY, 26)
    ctx.font = 'bold 28px Arial'
    ctx.fillStyle = '#af9974'
    drawTextWithShadow(ctx, (formData.rolEnEquipo || 'N/A').toUpperCase(), rolX, teamY + 40, 28, 'Arial', '#af9974')

    // QR Code (abajo a la derecha, mejor posicionado)
    // Calcular posición del QR primero para nivelar el logo
    const qrSize = 100
    const qrPadding = 5  // Padding interno (reducido)
    const qrBorderWidth = 2  // Ancho del borde
    const qrX = CARD_WIDTH - qrSize - qrPadding * 2 - qrBorderWidth * 2 - padding - 5
    const qrY = CARD_HEIGHT - qrSize - qrPadding * 2 - qrBorderWidth * 2 - padding - 5

    // Logo del equipo (nivelado con el QR)
    if (formData.equipoLogo) {
        try {
            const logoImg = await loadImage(formData.equipoLogo)
            const logoSize = 120  // Tamaño más grande del logo
            const logoX = teamX

            // Nivelar el logo con el QR (misma altura Y, centrado verticalmente)
            const logoAspectRatio = logoImg.width / logoImg.height
            let logoWidth = logoSize
            let logoHeight = logoSize / logoAspectRatio

            // Si la altura calculada excede el tamaño, ajustar por altura
            if (logoHeight > logoSize) {
                logoHeight = logoSize
                logoWidth = logoSize * logoAspectRatio
            }

            // Centrar verticalmente el logo con el QR
            const logoY = qrY + (qrSize / 2) - (logoHeight / 2)

            // Alinear el logo a la izquierda
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

        // Si no hay baseUrl, usar una URL relativa (menos ideal para QR codes)
        const qrData = baseUrl
            ? `${baseUrl}/credencial/${formData.cedula}`
            : `/credencial/${formData.cedula}`

        const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#D4C5A9'  // Beige/arena claro para el fondo interno del QR
            },
            errorCorrectionLevel: 'M'
        })

        const qrImg = await loadImage(qrDataUrl)

        // Sombra sutil para dar profundidad
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2

        // Fondo beige/arena con borde redondeado para el QR
        const qrBgX = qrX - qrPadding - qrBorderWidth
        const qrBgY = qrY - qrPadding - qrBorderWidth
        const qrBgSize = qrSize + (qrPadding * 2) + (qrBorderWidth * 2)

        // Fondo beige/arena claro (similar al color #af9974 pero más claro)
        ctx.fillStyle = '#D4C5A9'  // Beige/arena claro con buen contraste
        roundRect(ctx, qrBgX, qrBgY, qrBgSize, qrBgSize, 8)
        ctx.fill()

        // Borde dorado
        ctx.strokeStyle = GOLD_COLOR
        ctx.lineWidth = qrBorderWidth
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

    // Aplicar efecto granulado
    addGrainEffect(ctx, CARD_WIDTH, CARD_HEIGHT, 0.05)

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/png')
    })
}

