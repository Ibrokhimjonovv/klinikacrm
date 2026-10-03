import React, { useEffect, useMemo, useState } from 'react';
import styles from './NurseRooms.module.scss';
// ⚠️ Papka joylashuviga qarab yo'lni to'g'rilang (AdminRooms bilan bir xil chuqurlikda deb olindi):
import { api } from '../../../App';
import Pagination from '../../../components/shared/Pagination/Pagination';
import usePagination from '../../../components/shared/Pagination/usePagination';

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
})

const ROOM_TYPE_LABELS = {
    STANDARD: 'Standard',
    LUX: 'Lux',
}

const OTHER_FLOOR = 'other'

const floorLabel = (floor) =>
    floor === OTHER_FLOOR ? 'Boshqa' : `${floor}-qavat`

const formatSum = (n) => Number(n || 0).toLocaleString('uz-UZ')

// Faqat faol yotoqlar
const activeBeds = (room) => (room.beds || []).filter(b => b.is_active)

// Qavatlarni tartiblash: raqamlar o'sish tartibida, "Boshqa" oxirida
const compareFloors = (a, b) => {
    if (a === OTHER_FLOOR) return 1
    if (b === OTHER_FLOOR) return -1
    return Number(a) - Number(b)
}

const NurseRooms = () => {
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [expandedRoomId, setExpandedRoomId] = useState(null)
    const [search, setSearch] = useState('')
    const [onlyFree, setOnlyFree] = useState(false)
    const [activeFloor, setActiveFloor] = useState('all') // 'all' yoki qavat raqami

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

    // ------------------------------------------------------------
    // Qavatlar ro'yxati (filtr tugmalari uchun) — hamma xonalardan
    // ------------------------------------------------------------
    const floors = useMemo(() => {
        const set = new Set(rooms.map(r => r.floor ?? OTHER_FLOOR))
        return Array.from(set).sort(compareFloors)
    }, [rooms])

    // ------------------------------------------------------------
    // Filtr (qavat + bo'sh yotoq + qidiruv) va tartiblash (qavat, xona raqami).
    // Pagination shu yassi (tekis) ro'yxat ustida ishlaydi.
    // ------------------------------------------------------------
    const sortedRooms = useMemo(() => {
        const q = search.trim().toLowerCase()

        return rooms
            .filter((room) => {
                const floorKey = room.floor ?? OTHER_FLOOR
                if (activeFloor !== 'all' && String(floorKey) !== String(activeFloor)) return false

                const freeCount = activeBeds(room).filter(b => !b.is_occupied).length
                if (onlyFree && freeCount === 0) return false

                if (q) {
                    const haystack = `${floorLabel(floorKey)} ${room.number} ${room.number}-xona`.toLowerCase()
                    if (!haystack.includes(q)) return false
                }

                return true
            })
            .sort((a, b) => {
                const byFloor = compareFloors(a.floor ?? OTHER_FLOOR, b.floor ?? OTHER_FLOOR)
                if (byFloor !== 0) return byFloor
                return String(a.number).localeCompare(String(b.number), undefined, { numeric: true })
            })
    }, [rooms, search, onlyFree, activeFloor])

    // ------------------------------------------------------------
    // Pagination — sahifada ko'rinadigan xonalar
    // ------------------------------------------------------------
    const {
        pageItems,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
    } = usePagination(sortedRooms, 25)

    // Filtr o'zgarsa (natija soni bir xil bo'lsa ham) — 1-sahifaga qaytamiz
    useEffect(() => {
        setPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, onlyFree, activeFloor])

    // ------------------------------------------------------------
    // Qavat statistikasi — butun filtrlangan ro'yxatdan hisoblanadi
    // (qavat ikki sahifaga bo'linib ketsa ham raqamlar to'g'ri chiqadi)
    // ------------------------------------------------------------
    const floorStats = useMemo(() => {
        const stats = {}
        sortedRooms.forEach(room => {
            const key = room.floor ?? OTHER_FLOOR
            if (!stats[key]) stats[key] = { rooms: 0, beds: 0, free: 0 }
            const beds = activeBeds(room)
            stats[key].rooms += 1
            stats[key].beds += beds.length
            stats[key].free += beds.filter(b => !b.is_occupied).length
        })
        return stats
    }, [sortedRooms])

    // ------------------------------------------------------------
    // Joriy sahifadagi xonalarni qavat bo'yicha guruhlash
    // (pageItems allaqachon tartiblangan)
    // ------------------------------------------------------------
    const groupedByFloor = useMemo(() => {
        const map = new Map()
        pageItems.forEach(room => {
            const key = room.floor ?? OTHER_FLOOR
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(room)
        })
        return Array.from(map.entries()).map(([floor, floorRooms]) => ({ floor, rooms: floorRooms }))
    }, [pageItems])

    const totalBeds = rooms.reduce((sum, r) => sum + activeBeds(r).length, 0)
    const totalFreeBeds = rooms.reduce(
        (sum, r) => sum + activeBeds(r).filter(b => !b.is_occupied).length,
        0
    )

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div>
                    <h2>Xonalar</h2>
                    <p className={styles.subtitle}>
                        {floors.length} qavat · {rooms.length} xona · Jami {totalBeds} yotoq ·{' '}
                        <span className={styles.freeHighlight}>{totalFreeBeds} bo'sh</span>
                    </p>
                </div>

                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Qavat yoki xona raqami bo'yicha qidirish"
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

            {/* QAVATLAR BO'YICHA FILTR */}
            {!loading && !error && floors.length > 1 && (
                <div className={styles.floorTabs}>
                    <button
                        type="button"
                        className={`${styles.floorTab} ${activeFloor === 'all' ? styles.active : ''}`}
                        onClick={() => setActiveFloor('all')}
                    >
                        Barchasi
                    </button>
                    {floors.map(f => (
                        <button
                            key={f}
                            type="button"
                            className={`${styles.floorTab} ${String(activeFloor) === String(f) ? styles.active : ''}`}
                            onClick={() => setActiveFloor(f)}
                        >
                            {floorLabel(f)}
                        </button>
                    ))}
                </div>
            )}

            {loading && <p className={styles.loading}>Yuklanmoqda...</p>}
            {error && <p className={styles.loading}>Xatolik: {error}</p>}

            {!loading && !error && total === 0 && (
                <div className={styles.empty}>
                    <i className="bi bi-info-circle"></i>
                    <span>Mos xonalar topilmadi</span>
                </div>
            )}

            {!loading && !error && groupedByFloor.map(({ floor, rooms: floorRooms }) => {
                const stat = floorStats[floor] || { rooms: floorRooms.length, beds: 0, free: 0 }

                return (
                    <div key={floor} className={styles.blockSection}>
                        <div className={styles.floorHead}>
                            <h3 className={styles.blockTitle}>
                                <i className="bi bi-building"></i> {floorLabel(floor)}
                            </h3>
                            <div className={styles.floorStats}>
                                <span>{stat.rooms} ta xona</span>
                                <span className={stat.free === 0 ? styles.statFull : styles.statFree}>
                                    {stat.free}/{stat.beds} bo'sh
                                </span>
                            </div>
                        </div>

                        <div className={styles.roomList}>
                            {floorRooms.map((room) => {
                                const isExpanded = expandedRoomId === room.id
                                const beds = activeBeds(room)
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
                                                <span>{formatSum(room.price_per_day)} so'm/kun</span>
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
                                                            {formatSum(Number(room.price_per_day) * getDaysForRoom(room.id))} so'm
                                                            <em>
                                                                {formatSum(room.price_per_day)} so'm × {getDaysForRoom(room.id)} kun
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
                )
            })}

            {!loading && !error && (
                <Pagination
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                />
            )}
        </div>
    )
}

export default NurseRooms