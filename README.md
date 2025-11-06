# Generador de Carnets - Club de Tiro Deportivo del Valle

Plataforma web para generar carnets de identificación del Club de Tiro Deportivo del Valle.

## Características

- ✅ Formulario completo con todos los campos del carnet
- ✅ Carga de foto del miembro
- ✅ Generación de imagen frontal del carnet
- ✅ Generación de imagen trasera del carnet
- ✅ Código QR automático
- ✅ Medidas estándar para impresión (CR80: 85.6mm x 53.98mm)
- ✅ Descarga de imágenes en alta resolución (300 DPI)

## Tecnologías

- React 19
- Vite
- Tailwind CSS 3
- Canvas API
- QRCode.js

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Construcción

```bash
npm run build
```

## Uso

1. Completa el formulario con los datos del miembro
2. Carga una foto del miembro
3. Haz clic en "Generar Carnet"
4. Descarga las imágenes frontal y trasera
5. Imprime las tarjetas en tamaño estándar CR80

## Medidas de Impresión

Las tarjetas se generan en formato **VERTICAL** (más alto que ancho) con las siguientes medidas:
- Ancho: 5.5 cm (650 píxeles a 300 DPI)
- Alto: 8.5 cm (1004 píxeles a 300 DPI)
- Resolución: 300 DPI (apta para impresión profesional)
- Formato: Vertical (portrait orientation)
