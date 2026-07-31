import { useCallback, useState } from 'react'
import CarnetPreview from './CarnetPreview'

const buildTiltStyle = (rotateX, rotateY, { subtleScale = false, fillImage = false } = {}) => {
    const active = rotateX !== 0 || rotateY !== 0
    const scale = active ? (subtleScale ? '1.05' : '1.12') : '1'
    const z = active ? (subtleScale ? '12px' : '25px') : '0px'
    const base = {
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, 1) translateZ(${z})`,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
        cursor: 'pointer'
    }
    if (!fillImage) {
        return base
    }
    return {
        ...base,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        maxWidth: '100%',
        maxHeight: '100%'
    }
}

/**
 * Misma interacción que el generador: inclinación 3D al mover el puntero sobre la cara del carnet.
 */
/** compact: tamaño único · compactWide: más bajo para poner dos caras en fila */
function TiltCarnetFace({ src, alt, placeholder = 'Sin imagen', compact = false, compactWide = false }) {
    const subtleTilt = Boolean(compactWide)
    const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 })

    const handlePointerMove = useCallback((e) => {
        const el = e.currentTarget
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((y - centerY) / centerY) * -10
        const rotateY = ((x - centerX) / centerX) * 10
        setTransform({ rotateX, rotateY })
    }, [])

    const handlePointerLeave = useCallback(() => {
        setTransform({ rotateX: 0, rotateY: 0 })
    }, [])

    const frameStyle =
        compactWide
            ? {
                  width: '100%',
                  maxWidth: 'min(100%, 6cm)',
                  minWidth: 0,
                  aspectRatio: '6 / 9',
                  height: 'auto',
                  padding: '0.25rem',
                  perspective: '1000px',
                  boxShadow: 'none',
                  boxSizing: 'border-box'
              }
            : compact
              ? {
                    width: '5cm',
                    height: '7.25cm',
                    padding: '0.35rem',
                    perspective: '1000px',
                    boxShadow: 'none'
                }
              : { perspective: '1000px' }

    const placeholderStyle = compactWide
        ? {
              width: '100%',
              height: '100%',
              minHeight: 0,
              aspectRatio: undefined,
              boxSizing: 'border-box'
          }
        : compact
          ? { width: '5cm', height: '7.25cm' }
          : undefined

    return (
        <CarnetPreview
            src={src}
            alt={alt}
            placeholder={placeholder}
            interactive
            fillFrame={compactWide}
            frameClassName="touch-none select-none !border-0 w-full"
            frameStyle={frameStyle}
            placeholderStyle={placeholderStyle}
            imageStyle={buildTiltStyle(transform.rotateX, transform.rotateY, {
                subtleScale: subtleTilt,
                fillImage: compactWide
            })}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        />
    )
}

export default TiltCarnetFace
