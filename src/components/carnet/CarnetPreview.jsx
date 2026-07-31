import React from 'react'

function CarnetPreview({
    src,
    alt,
    placeholder = 'Sin imagen disponible',
    interactive = false,
    /** Imagen a ancho/alto del marco (p. ej. marco fluido con aspect-ratio) */
    fillFrame = false,
    frameClassName = '',
    frameStyle: frameStyleProp = {},
    imageClassName = '',
    imageStyle: imageStyleProp = {},
    placeholderClassName = '',
    placeholderStyle: placeholderStyleProp = {},
    ...eventHandlers
}) {
    const frameStyle = {
        width: '6cm',
        height: '9cm',
        padding: interactive ? '0.5rem' : 0,
        boxShadow: interactive ? 'inset 0 0 10px rgba(0, 0, 0, 0.8)' : undefined,
        perspective: interactive ? '1000px' : undefined,
        ...frameStyleProp
    }

    const imageStyle = {
        objectFit: 'cover',
        display: 'block',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.8)',
        ...imageStyleProp
    }

    const placeholderStyle = {
        width: '6cm',
        height: '9cm',
        ...placeholderStyleProp
    }

    const frameLayoutClass = fillFrame ? 'items-stretch justify-stretch' : 'justify-center items-center'

    return (
        <div
            className={`mx-auto flex ${frameLayoutClass} ${interactive ? 'border border-tactical-border' : ''} ${frameClassName}`}
            style={frameStyle}
            {...(interactive ? eventHandlers : {})}
        >
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className={`rounded ${fillFrame ? 'w-full h-full min-w-0 min-h-0' : ''} ${imageClassName}`}
                    style={imageStyle}
                />
            ) : (
                <div
                    className={`flex items-center justify-center text-center text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em] border border-dashed border-tactical-border min-w-0 min-h-0 ${fillFrame ? 'w-full h-full' : ''} ${placeholderClassName}`}
                    style={placeholderStyle}
                >
                    {placeholder}
                </div>
            )}
        </div>
    )
}

export default CarnetPreview
