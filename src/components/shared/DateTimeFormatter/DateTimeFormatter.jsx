// src/components/DateTimeFormatter/DateTimeFormatter.jsx
import React from 'react';

const DateTimeFormatter = ({ date, format = 'datetime', className = '' }) => {
    // Sanani formatlash funksiyasi
    const formatDateTime = (dateString) => {
        if (!dateString) return '00:00 01.01.2026'
        
        try {
            const date = new Date(dateString)
            
            // Agar date invalid bo'lsa
            if (isNaN(date.getTime())) {
                return '00:00 01.01.2026'
            }
            
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            
            return `${hours}:${minutes} ${day}.${month}.${year}`
        } catch (error) {
            console.error('Sanani formatlashda xatolik:', error)
            return '00:00 01.01.2026'
        }
    }

    // Faqat vaqt formatlash
    const formatTimeOnly = (dateString) => {
        if (!dateString) return '00:00'
        
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return '00:00'
            
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            
            return `${hours}:${minutes}`
        } catch (error) {
            return '00:00'
        }
    }

    // Faqat sana formatlash
    const formatDateOnly = (dateString) => {
        if (!dateString) return '01.01.2026'
        
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return '01.01.2026'
            
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            
            return `${day}.${month}.${year}`
        } catch (error) {
            return '01.01.2026'
        }
    }

    // Formatga qarab tanlash
    const getFormattedValue = () => {
        switch(format) {
            case 'time':
                return formatTimeOnly(date)
            case 'date':
                return formatDateOnly(date)
            case 'datetime':
            default:
                return formatDateTime(date)
        }
    }

    return (
        <span className={className}>
            {getFormattedValue()}
        </span>
    )
}

export default DateTimeFormatter