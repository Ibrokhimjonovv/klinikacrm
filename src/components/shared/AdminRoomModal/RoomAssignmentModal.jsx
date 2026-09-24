import React, { useEffect, useState } from 'react';
import s from './RoomAssignmentModal.module.scss';
// ⚠️ Fayllar qaysi papkada joylashishiga qarab yo'llarni to'g'rilang:
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';

const emptyForm = {
    room: '',
    bed: '',
    price_per_day: '',
    start_date: '',
    note: '',
}

const ROOM_TYPE_LABELS = {
    STANDARD: 'Standard',
    LUX: 'Lux',
}

// props:
// isOpen, onClose — Modal komponenti bilan bir xil
// patientId — RoomAssignment yaratishda kerak bo'ladigan bemor id'si
// onSuccess(assignment) — muvaffaqiyatli saqlangandan keyin chaqiriladi
const RoomAssignmentModal = ({ isOpen, onClose, patientId, onSuccess }) => {
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const fetchRooms = async () => {
        try {
            setLoading(true)
            setLoadError('')
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/rooms/`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (!res.ok) throw new Error()
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setRooms(list.filter(r => r.is_active))
        } catch {
            setLoadError('Xonalarni yuklashda xatolik yuz berdi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            setForm({ ...emptyForm, start_date: new Date().toISOString().slice(0, 16) })
            setError('')
            fetchRooms()
        }
    }, [isOpen])

    const selectedRoom = rooms.find(r => String(r.id) === String(form.room))
    const availableBeds = (selectedRoom?.beds || []).filter(b => b.is_active && !b.is_occupied)

    const handleRoomChange = (roomId) => {
        const room = rooms.find(r => String(r.id) === String(roomId))
        setForm(prev => ({
            ...prev,
            room: roomId,
            bed: '',
            price_per_day: room ? room.price_per_day : '',
        }))
    }

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!form.bed) {
            setError('Yotoq tanlanishi shart')
            return
        }
        if (!form.start_date) {
            setError('Boshlanish sanasi kiritilishi shart')
            return
        }
        if (form.price_per_day === '' || Number(form.price_per_day) < 0) {
            setError("Narx to'g'ri kiritilishi shart")
            return
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/room-assignments/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bed: Number(form.bed),
                    patient: patientId,
                    price_per_day: Number(form.price_per_day),
                    start_date: form.start_date,
                    status: 'ACTIVE',
                    note: form.note.trim(),
                }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setError(
                    data?.bed?.[0] || data?.non_field_errors?.[0] || data?.detail || data?.message || 'Saqlashda xatolik yuz berdi'
                )
                return
            }

            if (onSuccess) onSuccess(data)
            onClose()
        } catch {
            setError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={s.Wrap}>
                <h2>Bemorni yotoqqa joylashtirish</h2>

                {loading ? (
                    <p className={s.State}>Yuklanmoqda...</p>
                ) : loadError ? (
                    <p className={s.ServerError}><i className="bi bi-exclamation-circle-fill"></i> {loadError}</p>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <div className={s.Input}>
                            <p>Xona *</p>
                            <select
                                value={form.room}
                                onChange={(e) => handleRoomChange(e.target.value)}
                                disabled={saving}
                            >
                                <option value="">Tanlang</option>
                                {rooms.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.block} blok — {r.number}-xona ({ROOM_TYPE_LABELS[r.room_type] || r.room_type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={s.Input}>
                            <p>Yotoq *</p>
                            <select
                                value={form.bed}
                                onChange={(e) => handleChange('bed', e.target.value)}
                                disabled={saving || !form.room}
                            >
                                <option value="">
                                    {!form.room
                                        ? 'Avval xonani tanlang'
                                        : availableBeds.length === 0
                                            ? "Bo'sh yotoq yo'q"
                                            : 'Tanlang'}
                                </option>
                                {availableBeds.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}-yotoq</option>
                                ))}
                            </select>
                        </div>

                        <div className={s.Row}>
                            <div className={s.Input}>
                                <p>Narxi (kuniga, so'm) *</p>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.price_per_day}
                                    onChange={(e) => handleChange('price_per_day', e.target.value)}
                                    disabled={saving}
                                />
                            </div>
                            <div className={s.Input}>
                                <p>Boshlanish sanasi *</p>
                                <input
                                    type="datetime-local"
                                    value={form.start_date}
                                    onChange={(e) => handleChange('start_date', e.target.value)}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className={s.Input}>
                            <p>Izoh</p>
                            <textarea
                                rows={3}
                                value={form.note}
                                onChange={(e) => handleChange('note', e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        {error && (
                            <p className={s.ServerError}>
                                <i className="bi bi-exclamation-circle-fill"></i> {error}
                            </p>
                        )}

                        <button type="submit" className={s.SubmitBtn} disabled={saving}>
                            {saving ? 'Saqlanmoqda...' : 'Yotoqqa joylashtirish'}
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    )
}

export default RoomAssignmentModal