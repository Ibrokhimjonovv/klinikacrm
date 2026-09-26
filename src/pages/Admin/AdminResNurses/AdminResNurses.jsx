import React, { useEffect, useRef, useState } from 'react';
import s from './AdminResNurses.module.scss';
// ⚠️ Fayllar qaysi papkada joylashishiga qarab yo'llarni to'g'rilang:
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

// ⚠️ /nurse-profiles/ javobining aniq maydon nomlari taxmin
// qilindi (boshqa fayllardagi nurse obyektlariga qarab: first_name,
// last_name, middle_name, specialty, department, contact_number).
// Agar backend boshqacha nom qaytarsa, FAQAT shu joyni (emptyForm,
// normalizeNurses, handleSubmit ichidagi payload) moslang.

const emptyForm = {
    first_name: '',
    last_name: '',
    middle_name: '',
    specialty: '',
    department: '',
    contact_number: '',
    is_active: true,
}

const normalizeNurses = (d) => ({
    id: d.id,
    first_name: d.first_name || '',
    last_name: d.last_name || '',
    middle_name: d.middle_name || '',
    specialty: typeof d.specialty === 'object' ? (d.specialty?.name || '') : (d.specialty || ''),
    department: typeof d.department === 'object' ? (d.department?.name || '') : (d.department || ''),
    contact_number: d.contact_number || '',
    is_active: d.is_active ?? true,
})

const fullName = (d) => [d.first_name, d.last_name, d.middle_name].filter(Boolean).join(' ').trim() || `Xodim #${d.id}`

const AdminResNurses = () => {
    const [nurses, setNurses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [search, setSearch] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null) // null => yangi qo'shish, aks holda tahrirlash
    const [form, setForm] = useState(emptyForm)

    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)

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

    const fetchNurses = async () => {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/nurse-profiles/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setNurses(list.map(normalizeNurses))
        } catch (err) {
            console.error('Hamshira ro\'yxatini olishda xatolik:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNurses()
    }, [])

    const filtered = nurses.filter(d =>
        fullName(d).toLowerCase().includes(search.toLowerCase()) ||
        d.specialty.toLowerCase().includes(search.toLowerCase())
    )

    // ---------- Create / edit modal ----------

    const openCreateModal = () => {
        setEditingId(null)
        setForm(emptyForm)
        setFormError('')
        setModalOpen(true)
    }

    const openEditModal = (nurse) => {
        setEditingId(nurse.id)
        setForm({
            first_name: nurse.first_name,
            last_name: nurse.last_name,
            middle_name: nurse.middle_name,
            specialty: nurse.specialty,
            department: nurse.department,
            contact_number: nurse.contact_number,
            is_active: !!nurse.is_active,
        })
        setFormError('')
        setModalOpen(true)
    }

    const closeModal = () => {
        if (saving) return
        setModalOpen(false)
    }

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFormError('')

        if (!form.first_name.trim() || !form.last_name.trim()) {
            setFormError("Ism va familiya kiritilishi shart")
            return
        }

        const payload = {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            middle_name: form.middle_name.trim(),
            specialty: form.specialty.trim(),
            department: form.department.trim(),
            contact_number: form.contact_number.trim(),
            is_active: form.is_active,
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const url = editingId ? `${api}/nurse-profiles/${editingId}/` : `${api}/nurse-profiles/`
            const method = editingId ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: authHeaders(token),
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setFormError(
                    data?.first_name?.[0] || data?.detail || data?.message || "Saqlashda xatolik yuz berdi"
                )
                return
            }

            setModalOpen(false)
            showToast('success', editingId ? 'Hamshira ma\'lumotlari yangilandi' : "Yangi hamshira qo'shildi")
            fetchNurses()
        } catch (err) {
            setFormError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (nurse) => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/nurse-profiles/${nurse.id}/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ is_active: !nurse.is_active }),
            })
            if (!res.ok) throw new Error()
            setNurses(prev => prev.map(d => d.id === nurse.id ? { ...d, is_active: !d.is_active } : d))
        } catch {
            showToast('error', "Holatni o'zgartirishda xatolik yuz berdi")
        }
    }

    // ---------- Delete confirm modal ----------

    const askDelete = (nurse) => {
        setDeleteTarget(nurse)
    }

    const closeDeleteModal = () => {
        if (deleting) return
        setDeleteTarget(null)
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/nurse-profiles/${deleteTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setNurses(prev => prev.filter(d => d.id !== deleteTarget.id))
            setDeleteTarget(null)
            showToast('success', "Hamshora o'chirildi")
        } catch {
            showToast('error', "O'chirishda xatolik yuz berdi")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className={s.wrapper}>
            {toast && (
                <div className={`${s.toast} ${s[toast.type]}`}>
                    <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`}></i>
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => setToast(null)}>
                        <i className="bi bi-x"></i>
                    </button>
                </div>
            )}

            <div className={s.header}>
                <div>
                    <h2>Qabul hamshiralari</h2>
                    <p className={s.subtitle}>Klinika qabul hamshiralari ro'yxatini boshqarish</p>
                </div>
                <button className={s.primaryBtn} onClick={openCreateModal}>
                    <i className="bi bi-plus-lg"></i> Hamshira qo'shish
                </button>
            </div>

            <div className={s.searchRow}>
                <div className={s.searchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Ism yoki mutaxassislik bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && <p className={s.loading}>Yuklanmoqda...</p>}
            {error && <p className={s.loading}>Xatolik: {error}</p>}

            {!loading && !error && filtered.length === 0 && (
                <p className={s.empty}>Hech qanday hamshira topilmadi</p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>F.I.O</th>
                                <th>Mutaxassislik</th>
                                <th>Bo'lim</th>
                                <th>Telefon</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((d) => (
                                <tr key={d.id}>
                                    <td>
                                        <div className={s.nameWrap}>
                                            <div className={s.avatar}>{d.first_name ? d.first_name[0].toUpperCase() : '?'}</div>
                                            <span className={s.nameText}>{fullName(d)}</span>
                                        </div>
                                    </td>
                                    <td>{d.specialty || '—'}</td>
                                    <td>{d.department || '—'}</td>
                                    <td>{d.contact_number || '—'}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`${s.statusToggle} ${d.is_active ? s.active : s.inactive}`}
                                            onClick={() => toggleActive(d)}
                                        >
                                            <i className={`bi ${d.is_active ? 'bi-check-circle-fill' : 'bi-slash-circle'}`}></i>
                                            {d.is_active ? 'Faol' : 'Nofaol'}
                                        </button>
                                    </td>
                                    <td className={s.rowActions}>
                                        <button type="button" onClick={() => openEditModal(d)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className={s.dangerIcon}
                                            onClick={() => askDelete(d)}
                                        >
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Hamshira qo'shish / tahrirlash */}
            <Modal isOpen={modalOpen} onClose={closeModal}>
                <div className={s.modalContent}>
                    <h3>{editingId ? 'Hamshirani tahrirlash' : "Yangi hamshira qo'shish"}</h3>

                    <form onSubmit={handleSubmit}>
                        <div className={s.fieldRow}>
                            <label>
                                Ism *
                                <input
                                    type="text"
                                    placeholder="Masalan: Bekzodbek"
                                    value={form.first_name}
                                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                                    disabled={saving}
                                />
                            </label>

                            <label>
                                Familiya *
                                <input
                                    type="text"
                                    placeholder="Masalan: Ulug'bekov"
                                    value={form.last_name}
                                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                                    disabled={saving}
                                />
                            </label>
                        </div>

                        <label>
                            Otasining ismi
                            <input
                                type="text"
                                placeholder="Masalan: Nurmuhammad o'g'li"
                                value={form.middle_name}
                                onChange={(e) => handleFieldChange('middle_name', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <div className={s.fieldRow}>
                            <label>
                                Mutaxassislik
                                <input
                                    type="text"
                                    placeholder="Masalan: Mrt"
                                    value={form.specialty}
                                    onChange={(e) => handleFieldChange('specialty', e.target.value)}
                                    disabled={saving}
                                />
                            </label>

                            <label>
                                Bo'lim
                                <input
                                    type="text"
                                    placeholder="Masalan: Bosh hamshira"
                                    value={form.department}
                                    onChange={(e) => handleFieldChange('department', e.target.value)}
                                    disabled={saving}
                                />
                            </label>
                        </div>

                        <label>
                            Telefon
                            <input
                                type="text"
                                placeholder="+998 90 123 45 67"
                                value={form.contact_number}
                                onChange={(e) => handleFieldChange('contact_number', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <label className={s.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                                disabled={saving}
                            />
                            Hamshira faol
                        </label>

                        {formError && (
                            <p className={s.formError}>
                                <i className="bi bi-exclamation-circle-fill"></i> {formError}
                            </p>
                        )}

                        <div className={s.modalActions}>
                            <button type="button" className={s.secondaryBtn} onClick={closeModal} disabled={saving}>
                                Bekor qilish
                            </button>
                            <button type="submit" className={s.primaryBtn} disabled={saving}>
                                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* O'chirishni tasdiqlash */}
            <Modal isOpen={!!deleteTarget} onClose={closeDeleteModal}>
                <div className={s.confirmContent}>
                    <h3>Hamshirani o'chirish</h3>
                    <p>
                        {deleteTarget && (
                            <>"{fullName(deleteTarget)}" ni o'chirishni tasdiqlaysizmi?</>
                        )}
                    </p>

                    <div className={s.modalActions}>
                        <button type="button" className={s.secondaryBtn} onClick={closeDeleteModal} disabled={deleting}>
                            Bekor qilish
                        </button>
                        <button type="button" className={s.primaryBtn} onClick={confirmDelete} disabled={deleting}>
                            {deleting ? "O'chirilmoqda..." : "O'chirish"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default AdminResNurses