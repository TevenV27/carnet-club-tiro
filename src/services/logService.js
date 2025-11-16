import { db, auth } from '../firebase/config'
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore'

const logsCollection = collection(db, 'logs')

/**
 * Formatea una fecha a formato YYYY-MM-DD
 */
const formatDate = (date) => {
    const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Registra un log de actividad
 * @param {string} action - Acción realizada (crear, actualizar, eliminar)
 * @param {string} collection - Nombre de la colección afectada
 * @param {string} documentId - ID del documento afectado
 * @param {string} description - Descripción de la acción
 * @param {object} metadata - Información adicional (opcional)
 */
export const logAction = async (action, collectionName, documentId, description, metadata = {}) => {
    try {
        const now = new Date()
        const dateKey = formatDate(now)
        
        // Obtener usuario actual
        const currentUser = auth.currentUser
        const userId = currentUser?.uid || null
        const userEmail = currentUser?.email || null
        const userName = currentUser?.displayName || userEmail || 'Usuario desconocido'
        
        await addDoc(logsCollection, {
            action, // 'crear', 'actualizar', 'eliminar'
            collection: collectionName,
            documentId,
            description,
            metadata,
            userId,
            userEmail,
            userName,
            timestamp: Timestamp.fromDate(now),
            dateKey, // YYYY-MM-DD para agrupar por día
            createdAt: now
        })
    } catch (error) {
        console.error('Error registrando log:', error)
        // No lanzar error para no interrumpir la operación principal
    }
}

/**
 * Obtiene todos los días únicos que tienen logs
 * @returns {Promise<Array>} Array de objetos con { dateKey, count, lastActivity }
 */
export const getLogDays = async () => {
    try {
        const snapshot = await getDocs(query(logsCollection, orderBy('timestamp', 'desc')))
        
        // Agrupar por dateKey
        const daysMap = new Map()
        
        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data()
            const dateKey = data.dateKey
            
            if (!daysMap.has(dateKey)) {
                daysMap.set(dateKey, {
                    dateKey,
                    count: 0,
                    lastActivity: data.timestamp
                })
            }
            
            const dayData = daysMap.get(dateKey)
            dayData.count += 1
            
            // Actualizar última actividad si es más reciente
            const currentTimestamp = data.timestamp?.toDate?.() ?? new Date(data.timestamp)
            const lastTimestamp = dayData.lastActivity?.toDate?.() ?? new Date(dayData.lastActivity)
            if (currentTimestamp > lastTimestamp) {
                dayData.lastActivity = data.timestamp
            }
        })
        
        // Convertir a array y ordenar por fecha (más reciente primero)
        const days = Array.from(daysMap.values())
        days.sort((a, b) => {
            const dateA = a.lastActivity?.toDate?.() ?? new Date(a.lastActivity)
            const dateB = b.lastActivity?.toDate?.() ?? new Date(b.lastActivity)
            return dateB - dateA
        })
        
        return days
    } catch (error) {
        console.error('Error obteniendo días de logs:', error)
        throw error
    }
}

/**
 * Obtiene todos los logs de un día específico
 * @param {string} dateKey - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>} Array de logs ordenados por timestamp
 */
export const getLogsByDate = async (dateKey) => {
    try {
        // Hacer solo el where para evitar necesidad de índice compuesto
        const q = query(
            logsCollection,
            where('dateKey', '==', dateKey)
        )
        
        const snapshot = await getDocs(q)
        
        // Mapear y ordenar en memoria
        const logs = snapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
                id: docSnap.id,
                action: data.action,
                collection: data.collection,
                documentId: data.documentId,
                description: data.description,
                metadata: data.metadata || {},
                userId: data.userId || null,
                userEmail: data.userEmail || null,
                userName: data.userName || 'Usuario desconocido',
                timestamp: data.timestamp,
                dateKey: data.dateKey,
                createdAt: data.createdAt
            }
        })
        
        // Ordenar por timestamp en memoria (ascendente)
        logs.sort((a, b) => {
            const timestampA = a.timestamp?.toDate?.() ?? new Date(a.timestamp || 0)
            const timestampB = b.timestamp?.toDate?.() ?? new Date(b.timestamp || 0)
            return timestampA - timestampB
        })
        
        return logs
    } catch (error) {
        console.error('Error obteniendo logs por fecha:', error)
        throw error
    }
}

