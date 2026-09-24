import React, { useEffect, useState } from 'react';
import styles from './DoctorRooms.module.scss';
// ⚠️ Papka joylashuviga qarab yo'lni to'g'rilang (AdminRooms bilan bir xil chuqurlikda deb olindi):
import { api } from '../../../App';

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
})

const ROOM_TYPE_LABELS = {
    STANDARD: 'Standard',
    LUX: 'Lux',
}

const DoctorRooms = () => {
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [expandedRoomId, setExpandedRoomId] = useState(null)
    const [search, setSearch] = useState('')
    const [onlyFree, setOnlyFree] = useState(false)

    // Har bir xona uchun alohida "necha kun" qiymati (narxni shunga ko'paytirib hisoblash uchun)
    const [daysByRoom, setDaysByRoom] = useState({})

    const getDaysForRoom = (roomId) => daysByRoom[roomId] ?? 1

    const setDaysForRoom = (roomId, value) => {
        const n = Math.max(1, Number(value) || 1)
        setDaysByRoom(prev => ({ ...prev, [roomId]: n }))
    }

    const fetchRooms = async () => {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/rooms/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setRooms(list.filter(r => r.is_active))
        } catch (err) {
            console.error('Xonalarni olishda xatolik:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRooms()
    }, [])

    const toggleRoom = (roomId) => {
        setExpandedRoomId(prev => (prev === roomId ? null : roomId))
    }

    const filteredRooms = rooms.filter((room) => {
        const beds = room.beds || []
        const freeCount = beds.filter(b => b.is_active && !b.is_occupied).length

        if (onlyFree && freeCount === 0) return false

        if (search.trim()) {
            const q = search.trim().toLowerCase()
            const haystack = `${room.block} ${room.number}`.toLowerCase()
            if (!haystack.includes(q)) return false
        }

        return true
    })

    const groupedByBlock = filteredRooms.reduce((acc, room) => {
        const block = room.block || 'Boshqa'
        if (!acc[block]) acc[block] = []
        acc[block].push(room)
        return acc
    }, {})

    const totalBeds = rooms.reduce((sum, r) => sum + (r.beds?.filter(b => b.is_active).length || 0), 0)
    const totalFreeBeds = rooms.reduce(
        (sum, r) => sum + (r.beds?.filter(b => b.is_active && !b.is_occupied).length || 0),
        0
    )

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div>
                    <h2>Xonalar</h2>
                    <p className={styles.subtitle}>
                        Jami {totalBeds} yotoq · <span className={styles.freeHighlight}>{totalFreeBeds} bo'sh</span>
                    </p>
                </div>

                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Blok yoki xona raqami bo'yicha qidirish"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <label className={styles.freeToggle}>
                        <input
                            type="checkbox"
                            checked={onlyFree}
                            onChange={(e) => setOnlyFree(e.target.checked)}
                        />
                        Faqat bo'sh yotoqli xonalar
                    </label>
                </div>
            </div>

            {loading && <p className={styles.loading}>Yuklanmoqda...</p>}
            {error && <p className={styles.loading}>Xatolik: {error}</p>}

            {!loading && !error && filteredRooms.length === 0 && (
                <div className={styles.empty}>
                    <i className="bi bi-info-circle"></i>
                    <span>Mos xonalar topilmadi</span>
                </div>
            )}

            {!loading && !error && filteredRooms.length > 0 && Object.entries(groupedByBlock).map(([block, blockRooms]) => (
                <div key={block} className={styles.blockSection}>
                    <h3 className={styles.blockTitle}>{block}</h3>

                    <div className={styles.roomList}>
                        {blockRooms.map((room) => {
                            const isExpanded = expandedRoomId === room.id
                            const beds = (room.beds || []).filter(b => b.is_active)
                            const occupiedCount = beds.filter(b => b.is_occupied).length
                            const freeCount = beds.length - occupiedCount
                            const isFull = beds.length > 0 && freeCount === 0

                            return (
                                <div key={room.id} className={styles.roomCard}>
                                    <div className={styles.roomCardHeader} onClick={() => toggleRoom(room.id)}>
                                        <div className={styles.roomInfo}>
                                            <span className={styles.roomNumber}>{room.number}-xona</span>
                                            <span className={styles.roomType}>
                                                {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                                            </span>
                                            <span className={`${styles.availabilityBadge} ${isFull ? styles.full : styles.free}`}>
                                                {isFull ? "To'lgan" : `${freeCount} ta bo'sh`}
                                            </span>
                                        </div>

                                        <div className={styles.roomMeta}>
                                            <span>{occupiedCount}/{beds.length} band</span>
                                            <span>{Number(room.price_per_day).toLocaleString('uz-UZ')} so'm/kun</span>
                                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className={styles.roomCardBody}>
                                            {room.description && (
                                                <p className={styles.roomDescription}>{room.description}</p>
                                            )}

                                            <div className={styles.priceCalc} onClick={(e) => e.stopPropagation()}>
                                                <div className={styles.priceCalcRow}>
                                                    <label htmlFor={`days-${room.id}`}>Narxi</label>
                                                    <div className={styles.daysInputWrap}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDaysForRoom(room.id, getDaysForRoom(room.id) - 1)}
                                                            disabled={getDaysForRoom(room.id) <= 1}
                                                        >
                                                            <i className="bi bi-dash"></i>
                                                        </button>
                                                        <input
                                                            id={`days-${room.id}`}
                                                            type="number"
                                                            min={1}
                                                            value={getDaysForRoom(room.id)}
                                                            onChange={(e) => setDaysForRoom(room.id, e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setDaysForRoom(room.id, getDaysForRoom(room.id) + 1)}
                                                        >
                                                            <i className="bi bi-plus"></i>
                                                        </button>
                                                        <span>kun</span>
                                                    </div>
                                                </div>

                                                <div className={styles.priceCalcTotal}>
                                                    <span>Jami narx</span>
                                                    <span>
                                                        {(Number(room.price_per_day) * getDaysForRoom(room.id)).toLocaleString('uz-UZ')} so'm
                                                        <em>
                                                            {Number(room.price_per_day).toLocaleString('uz-UZ')} so'm × {getDaysForRoom(room.id)} kun
                                                        </em>
                                                    </span>
                                                </div>
                                            </div>

                                            <table className={styles.bedTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Nomi</th>
                                                        <th>Holati</th>
                                                        <th>Bemor</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {beds.length === 0 && (
                                                        <tr>
                                                            <td colSpan={3} className={styles.emptyRow}>Yotoqlar yo'q</td>
                                                        </tr>
                                                    )}
                                                    {beds.map((bed) => (
                                                        <tr key={bed.id}>
                                                            <td>{bed.name}-yotoq</td>
                                                            <td>
                                                                {bed.is_occupied ? (
                                                                    <span className={styles.occupied}>Band</span>
                                                                ) : (
                                                                    <span className={styles.freeStatus}>Bo'sh</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {bed.patient
                                                                    ? `${bed.patient.last_name} ${bed.patient.first_name}`
                                                                    : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default DoctorRooms