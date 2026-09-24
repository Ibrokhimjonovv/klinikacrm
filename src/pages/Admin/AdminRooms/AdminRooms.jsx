import React, { useEffect, useRef, useState } from 'react';
import styles from './AdminRooms.module.scss';
// ⚠️ Fayllar qaysi papkada joylashishiga qarab yo'llarni to'g'rilang:
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const ROOM_TYPE_CHOICES = [
    { value: 'STANDARD', label: 'Standard' },
    { value: 'LUX', label: 'Lux' },
]

const FLOOR_CHOICES = [
    { value: '1', label: '1-qavat' },
    { value: '2', label: '2-qavat' },
    { value: '3', label: '3-qavat' },
    { value: '4', label: '4-qavat' },
]

const BED_CHOICES = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
]

const emptyRoomForm = {
    floor: FLOOR_CHOICES[0].value,
    number: '',
    room_type: ROOM_TYPE_CHOICES[0].value,
    price_per_day: '',
    description: '',
    is_active: true,
}

const emptyBedForm = {
    room: null,
    name: BED_CHOICES[0].value,
    is_active: true,
}

const AdminRooms = () => {
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [expandedRoomId, setExpandedRoomId] = useState(null)

    const [roomModalOpen, setRoomModalOpen] = useState(false)
    const [editingRoomId, setEditingRoomId] = useState(null)
    const [roomForm, setRoomForm] = useState(emptyRoomForm)
    const [roomSaving, setRoomSaving] = useState(false)
    const [roomFormError, setRoomFormError] = useState('')

    const [bedModalOpen, setBedModalOpen] = useState(false)
    const [editingBedId, setEditingBedId] = useState(null)
    const [bedForm, setBedForm] = useState(emptyBedForm)
    const [bedSaving, setBedSaving] = useState(false)
    const [bedFormError, setBedFormError] = useState('')
    const [bedNameOptions, setBedNameOptions] = useState(BED_CHOICES)

    // O'chirishni tasdiqlash uchun modallar
    const [deleteRoomTarget, setDeleteRoomTarget] = useState(null)
    const [deletingRoom, setDeletingRoom] = useState(false)

    const [deleteBedTarget, setDeleteBedTarget] = useState(null)
    const [deletingBed, setDeletingBed] = useState(false)

    // ---------- Toast (window.alert o'rniga) ----------

    const [toast, setToast] = useState(null) // { type: 'error' | 'success', message }
    const toastTimer = useRef(null)

    const showToast = (type, message) => {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast({ type, message })
        toastTimer.current = setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current)
        }
    }, [])

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
            setRooms(list)
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

    // ---------- Room modal ----------

    const openCreateRoom = () => {
        setEditingRoomId(null)
        setRoomForm(emptyRoomForm)
        setRoomFormError('')
        setRoomModalOpen(true)
    }

    const openEditRoom = (room) => {
        setEditingRoomId(room.id)
        setRoomForm({
            floor: room.floor ? String(room.floor) : FLOOR_CHOICES[0].value,
            number: room.number || '',
            room_type: room.room_type || ROOM_TYPE_CHOICES[0].value,
            price_per_day: room.price_per_day ?? '',
            description: room.description || '',
            is_active: !!room.is_active,
        })
        setRoomFormError('')
        setRoomModalOpen(true)
    }

    const closeRoomModal = () => {
        if (roomSaving) return
        setRoomModalOpen(false)
    }

    const handleRoomFieldChange = (field, value) => {
        setRoomForm(prev => ({ ...prev, [field]: value }))
    }

    const handleRoomSubmit = async (e) => {
        e.preventDefault()
        setRoomFormError('')

        if (!roomForm.floor) {
            setRoomFormError('Qavat tanlanishi shart')
            return
        }
        if (!roomForm.number.trim()) {
            setRoomFormError('Xona raqami kiritilishi shart')
            return
        }
        if (roomForm.price_per_day === '' || Number(roomForm.price_per_day) < 0) {
            setRoomFormError("Narx to'g'ri kiritilishi shart")
            return
        }

        const payload = {
            floor: Number(roomForm.floor),
            number: roomForm.number.trim(),
            room_type: roomForm.room_type,
            price_per_day: Number(roomForm.price_per_day),
            description: roomForm.description.trim(),
            is_active: roomForm.is_active,
        }

        setRoomSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const url = editingRoomId ? `${api}/rooms/${editingRoomId}/` : `${api}/rooms/`
            const method = editingRoomId ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: authHeaders(token),
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setRoomFormError(
                    data?.floor?.[0] || data?.number?.[0] || data?.detail || data?.message || 'Saqlashda xatolik yuz berdi'
                )
                return
            }

            setRoomModalOpen(false)
            showToast('success', editingRoomId ? 'Xona yangilandi' : "Yangi xona qo'shildi")
            fetchRooms()
        } catch (err) {
            setRoomFormError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setRoomSaving(false)
        }
    }

    // ---------- Room delete ----------

    const askDeleteRoom = (room) => {
        setDeleteRoomTarget(room)
    }

    const closeDeleteRoomModal = () => {
        if (deletingRoom) return
        setDeleteRoomTarget(null)
    }

    const confirmDeleteRoom = async () => {
        if (!deleteRoomTarget) return
        setDeletingRoom(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/rooms/${deleteRoomTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setRooms(prev => prev.filter(r => r.id !== deleteRoomTarget.id))
            setDeleteRoomTarget(null)
            showToast('success', "Xona o'chirildi")
        } catch {
            showToast('error', "O'chirishda xatolik yuz berdi")
        } finally {
            setDeletingRoom(false)
        }
    }

    // ---------- Bed modal ----------

    const openCreateBed = (room) => {
        const usedNames = (room.beds || []).map(b => b.name)
        const available = BED_CHOICES.filter(c => !usedNames.includes(c.value))

        if (available.length === 0) {
            showToast('error', "Bu xonada barcha yotoqlar (A, B) allaqachon qo'shilgan.")
            return
        }

        setEditingBedId(null)
        setBedForm({ room: room.id, name: available[0].value, is_active: true })
        setBedNameOptions(available)
        setBedFormError('')
        setBedModalOpen(true)
    }

    const openEditBed = (bed) => {
        setEditingBedId(bed.id)
        setBedForm({
            room: bed.room,
            name: bed.name || BED_CHOICES[0].value,
            is_active: !!bed.is_active,
        })
        setBedNameOptions(BED_CHOICES)
        setBedFormError('')
        setBedModalOpen(true)
    }

    const closeBedModal = () => {
        if (bedSaving) return
        setBedModalOpen(false)
    }

    const handleBedFieldChange = (field, value) => {
        setBedForm(prev => ({ ...prev, [field]: value }))
    }

    const handleBedSubmit = async (e) => {
        e.preventDefault()
        setBedFormError('')

        const payload = {
            room: bedForm.room,
            name: bedForm.name,
            is_active: bedForm.is_active,
        }

        setBedSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const url = editingBedId ? `${api}/beds/${editingBedId}/` : `${api}/beds/`
            const method = editingBedId ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: authHeaders(token),
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setBedFormError(
                    data?.name?.[0] || data?.room?.[0] || data?.detail || data?.message || 'Saqlashda xatolik yuz berdi'
                )
                return
            }

            setBedModalOpen(false)
            showToast('success', editingBedId ? 'Yotoq yangilandi' : "Yangi yotoq qo'shildi")
            fetchRooms()
        } catch (err) {
            setBedFormError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setBedSaving(false)
        }
    }

    // ---------- Bed delete ----------

    const askDeleteBed = (bed) => {
        if (bed.is_occupied) {
            showToast('error', "Band bo'lgan yotoqni o'chirib bo'lmaydi.")
            return
        }
        setDeleteBedTarget(bed)
    }

    const closeDeleteBedModal = () => {
        if (deletingBed) return
        setDeleteBedTarget(null)
    }

    const confirmDeleteBed = async () => {
        if (!deleteBedTarget) return
        setDeletingBed(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/beds/${deleteBedTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setDeleteBedTarget(null)
            showToast('success', "Yotoq o'chirildi")
            fetchRooms()
        } catch {
            showToast('error', "O'chirishda xatolik yuz berdi")
        } finally {
            setDeletingBed(false)
        }
    }

    const toggleRoom = (roomId) => {
        setExpandedRoomId(prev => (prev === roomId ? null : roomId))
    }

    // ---------- Render ----------

    const getFloorLabel = (floor) =>
        FLOOR_CHOICES.find(f => String(f.value) === String(floor))?.label || (floor ? `${floor}-qavat` : 'Boshqa')

    const groupedByfloor = rooms.reduce((acc, room) => {
        const floorKey = room.floor != null ? String(room.floor) : 'Boshqa'
        if (!acc[floorKey]) acc[floorKey] = []
        acc[floorKey].push(room)
        return acc
    }, {})

    return (
        <div className={styles.wrapper}>
            {toast && (
                <div className={`${styles.toast} ${styles[toast.type]}`}>
                    <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`}></i>
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => setToast(null)}>
                        <i className="bi bi-x"></i>
                    </button>
                </div>
            )}

            <div className={styles.header}>
                <h2>Xonalar va yotoqlar</h2>
                <button className={styles.primaryBtn} onClick={openCreateRoom}>
                    <i className="bi bi-plus-lg"></i> Yangi xona
                </button>
            </div>

            {loading && <p className={styles.loading}>Yuklanmoqda...</p>}
            {error && <p className={styles.loading}>Xatolik: {error}</p>}

            {!loading && !error && rooms.length === 0 && (
                <p className={styles.empty}>Hozircha xonalar mavjud emas.</p>
            )}

            {!loading && !error && rooms.length > 0 && Object.entries(groupedByfloor).map(([floor, floorRooms]) => (
                <div key={floor} className={styles.floorSection}>
                    <h3 className={styles.floorTitle}>{getFloorLabel(floor)}</h3>

                    <div className={styles.roomList}>
                        {floorRooms.map((room) => {
                            const isExpanded = expandedRoomId === room.id
                            const beds = room.beds || []
                            const occupiedCount = beds.filter(b => b.is_occupied).length

                            return (
                                <div key={room.id} className={styles.roomCard}>
                                    <div className={styles.roomCardHeader} onClick={() => toggleRoom(room.id)}>
                                        <div className={styles.roomInfo}>
                                            <span className={styles.roomNumber}>{room.number}</span>
                                            <span className={styles.roomType}>
                                                {ROOM_TYPE_CHOICES.find(t => t.value === room.room_type)?.label || room.room_type}
                                            </span>
                                            {!room.is_active && (
                                                <span className={styles.inactiveBadge}>Faol emas</span>
                                            )}
                                        </div>

                                        <div className={styles.roomMeta}>
                                            <span>{occupiedCount}/{beds.length} band</span>
                                            <span>{room.price_per_day} so'm/kun</span>
                                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className={styles.roomCardBody}>
                                            {room.description && (
                                                <p className={styles.roomDescription}>{room.description}</p>
                                            )}

                                            <div className={styles.roomActions}>
                                                <button type="button" onClick={() => openEditRoom(room)}>
                                                    <i className="bi bi-pencil"></i> Tahrirlash
                                                </button>
                                                <button type="button" className={styles.dangerBtn} onClick={() => askDeleteRoom(room)}>
                                                    <i className="bi bi-trash"></i> O'chirish
                                                </button>
                                                <button type="button" onClick={() => openCreateBed(room)}>
                                                    <i className="bi bi-plus-lg"></i> Yotoq qo'shish
                                                </button>
                                            </div>

                                            <table className={styles.bedTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Nomi</th>
                                                        <th>Holati</th>
                                                        <th>Bemor</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {beds.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className={styles.emptyRow}>Yotoqlar yo'q</td>
                                                        </tr>
                                                    )}
                                                    {beds.map((bed) => (
                                                        <tr key={bed.id}>
                                                            <td>{bed.name}</td>
                                                            <td>
                                                                {bed.is_occupied ? (
                                                                    <span className={styles.occupied}>Band</span>
                                                                ) : (
                                                                    <span className={styles.free}>Bo'sh</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {bed.patient
                                                                    ? `${bed.patient.last_name} ${bed.patient.first_name}`
                                                                    : '-'}
                                                            </td>
                                                            <td className={styles.bedRowActions}>
                                                                <button type="button" onClick={() => openEditBed(bed)}>
                                                                    <i className="bi bi-pencil"></i>
                                                                </button>
                                                                <button type="button" onClick={() => askDeleteBed(bed)}>
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
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

            {/* Xona qo'shish / tahrirlash */}
            <Modal isOpen={roomModalOpen} onClose={closeRoomModal}>
                <div className={styles.modalContent}>
                    <h3>{editingRoomId ? 'Xonani tahrirlash' : 'Yangi xona'}</h3>

                    <form onSubmit={handleRoomSubmit}>
                        <label>
                            Qavat
                            <select
                                value={roomForm.floor}
                                onChange={(e) => handleRoomFieldChange('floor', e.target.value)}
                                disabled={roomSaving}
                            >
                                {FLOOR_CHOICES.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Xona raqami
                            <input
                                type="text"
                                value={roomForm.number}
                                onChange={(e) => handleRoomFieldChange('number', e.target.value)}
                                disabled={roomSaving}
                            />
                        </label>

                        <label>
                            Xona turi
                            <select
                                value={roomForm.room_type}
                                onChange={(e) => handleRoomFieldChange('room_type', e.target.value)}
                                disabled={roomSaving}
                            >
                                {ROOM_TYPE_CHOICES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Narxi (kuniga, so'm)
                            <input
                                type="number"
                                min={0}
                                value={roomForm.price_per_day}
                                onChange={(e) => handleRoomFieldChange('price_per_day', e.target.value)}
                                disabled={roomSaving}
                            />
                        </label>

                        <label>
                            Izoh
                            <textarea
                                rows={3}
                                value={roomForm.description}
                                onChange={(e) => handleRoomFieldChange('description', e.target.value)}
                                disabled={roomSaving}
                            />
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={roomForm.is_active}
                                onChange={(e) => handleRoomFieldChange('is_active', e.target.checked)}
                                disabled={roomSaving}
                            />
                            Faol
                        </label>

                        {roomFormError && (
                            <p className={styles.formError}>
                                <i className="bi bi-exclamation-circle-fill"></i> {roomFormError}
                            </p>
                        )}

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={closeRoomModal} disabled={roomSaving}>
                                Bekor qilish
                            </button>
                            <button type="submit" className={styles.primaryBtn} disabled={roomSaving}>
                                {roomSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Yotoq qo'shish / tahrirlash */}
            <Modal isOpen={bedModalOpen} onClose={closeBedModal}>
                <div className={styles.modalContent}>
                    <h3>{editingBedId ? 'Yotoqni tahrirlash' : 'Yangi yotoq'}</h3>

                    <form onSubmit={handleBedSubmit}>
                        <label>
                            Yotoq
                            <select
                                value={bedForm.name}
                                onChange={(e) => handleBedFieldChange('name', e.target.value)}
                                disabled={bedSaving}
                            >
                                {bedNameOptions.map(b => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={bedForm.is_active}
                                onChange={(e) => handleBedFieldChange('is_active', e.target.checked)}
                                disabled={bedSaving}
                            />
                            Faol
                        </label>

                        {bedFormError && (
                            <p className={styles.formError}>
                                <i className="bi bi-exclamation-circle-fill"></i> {bedFormError}
                            </p>
                        )}

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={closeBedModal} disabled={bedSaving}>
                                Bekor qilish
                            </button>
                            <button type="submit" className={styles.primaryBtn} disabled={bedSaving}>
                                {bedSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Xonani o'chirishni tasdiqlash */}
            <Modal isOpen={!!deleteRoomTarget} onClose={closeDeleteRoomModal}>
                <div className={styles.confirmContent}>
                    <h3>Xonani o'chirish</h3>
                    <p>
                        {deleteRoomTarget && (
                            <>"{getFloorLabel(deleteRoomTarget.floor)} - {deleteRoomTarget.number}" xonasini o'chirishni tasdiqlaysizmi?</>
                        )}
                    </p>

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={closeDeleteRoomModal} disabled={deletingRoom}>
                            Bekor qilish
                        </button>
                        <button type="button" className={styles.primaryBtn} onClick={confirmDeleteRoom} disabled={deletingRoom}>
                            {deletingRoom ? "O'chirilmoqda..." : "O'chirish"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Yotoqni o'chirishni tasdiqlash */}
            <Modal isOpen={!!deleteBedTarget} onClose={closeDeleteBedModal}>
                <div className={styles.confirmContent}>
                    <h3>Yotoqni o'chirish</h3>
                    <p>
                        {deleteBedTarget && (
                            <>"{deleteBedTarget.name}" yotog'ini o'chirishni tasdiqlaysizmi?</>
                        )}
                    </p>

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={closeDeleteBedModal} disabled={deletingBed}>
                            Bekor qilish
                        </button>
                        <button type="button" className={styles.primaryBtn} onClick={confirmDeleteBed} disabled={deletingBed}>
                            {deletingBed ? "O'chirilmoqda..." : "O'chirish"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default AdminRooms