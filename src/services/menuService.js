import { db } from '../firebase/config'
import {
    collection,
    getDocs,
    orderBy,
    query
} from 'firebase/firestore'

const DEFAULT_MENUS = [
    {
        id: 'usuarios',
        label: 'Usuarios',
        path: 'usuarios'
    },
    {
        id: 'equipos',
        label: 'Equipos',
        path: 'equipos'
    },
    {
        id: 'torneos',
        label: 'Torneos',
        path: 'torneos'
    },
    {
        id: 'ranking',
        label: 'Ranking',
        path: 'ranking'
    },
    {
        id: 'gestion',
        label: 'Gestión',
        path: 'gestion/niveles'
    },
    {
        id: 'generador',
        label: 'Generador de Carnets',
        path: 'generador'
    }
]

export const getMenus = async () => {
    try {
        const menusCollection = collection(db, 'menus')

        let snapshot
        try {
            const menusQuery = query(menusCollection, orderBy('orden', 'asc'))
            snapshot = await getDocs(menusQuery)
        } catch (orderError) {
            console.warn('No se pudo ordenar los menús por el campo "orden". Usando consulta sin orden.', orderError)
            snapshot = await getDocs(menusCollection)
        }

        if (snapshot.empty) {
            console.warn('No se encontraron menús configurados en Firestore. Usando menú por defecto.')
            return DEFAULT_MENUS
        }

        return snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
                id: data.id || doc.id,
                label: data.label || data.nombre || 'Sin título',
                path: data.path || data.ruta || doc.id
            }
        })
    } catch (error) {
        console.error('Error obteniendo menús desde Firestore:', error)
        return DEFAULT_MENUS
    }
}

