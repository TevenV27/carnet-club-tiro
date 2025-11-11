import React from 'react'

function CarnetPreview({
    src,
    alt,
    placeholder = 'Sin imagen disponible',
    interactive = false,
    frameClassName = '',
    frameStyle: frameStyleProp = {},
    imageClassName = '',
    imageStyle: imageStyleProp = {},
    placeholderClassName = '',
    placeholderStyle: placeholderStyleProp = {},
    ...eventHandlers
}) {
    const frameStyle = {
        width: interactive ? '6.6cm' : '6cm',
        height: interactive ? '9.6cm' : '9cm',
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

    return (
        <div
            className={`flex justify-center items-center mx-auto ${interactive ? 'border border-tactical-border' : ''} ${frameClassName}`}
            style={frameStyle}
            {...(interactive ? eventHandlers : {})}
        >
            {src ? (
                <img src={src} alt={alt} className={`rounded ${imageClassName}`} style={imageStyle} />
            ) : (
                <div
                    className={`flex items-center justify-center text-center text-[10px] text-tactical-brass/50 font-tactical uppercase tracking-[0.4em] border border-dashed border-tactical-border ${placeholderClassName}`}
                    style={placeholderStyle}
                >
                    {placeholder}
                </div>
            )}
        </div>
    )
}

export default CarnetPreview
