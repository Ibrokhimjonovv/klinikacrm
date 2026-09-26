import React, { useEffect, useRef, useState } from 'react';
import s from './AdminMedicines.module.scss';
// ⚠️ Fayllar qaysi papkada joylashishiga qarab yo'llarni to'g'rilang:
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';

// ⚠️ Postman'dagi so'rovda body turi "x-www-form-urlencoded" ekan,
// shuning uchun JSON o'rniga URLSearchParams orqali yuboramiz va
// 'Content-Type' sarlavhasini o'zimiz qo'ymaymiz — brauzer buni
// avtomatik to'g'ri qo'yadi.
const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
})

const buildFormBody = (payload) => {
    const params = new URLSearchParams()
    Object.entries(payload).forEach(([key, value]) => {
        params.append(key, value)
    })
    return params
}

const formatSum = (n) => Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm"

const emptyForm = { name: '', description: '', price: '', is_active: true }

const AdminMedicines = () => {
    const [medicines, setMedicines] = useState([])
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

    const fetchMedicines = async () => {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/medicine/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setMedicines(list)
        } catch (err) {
            console.error('Dorilarni olishda xatolik:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMedicines()
    }, [])

    const filtered = medicines.filter(m =>
        m.name?.toLowerCase().includes(search.toLowerCase())
    )

    const openCreateModal = () => {
        setEditingId(null)
        setForm(emptyForm)
        setFormError('')
        setModalOpen(true)
    }

    const openEditModal = (medicine) => {
        setEditingId(medicine.id)
        setForm({
            name: medicine.name || '',
            description: medicine.description || '',
            price: medicine.price ?? '',
            is_active: !!medicine.is_active,
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

        if (!form.name.trim()) {
            setFormError("Dori nomi kiritilishi shart")
            return
        }
        if (form.price === '' || Number(form.price) < 0) {
            setFormError("Narx to'g'ri kiritilishi shart")
            return
        }

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            is_active: form.is_active,
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            // ⚠️ Faqat "create" endpointi tasdiqlangan
            // (api/v1/medicine/create/). Tahrirlash uchun REST
            // konvensiyasiga ko'ra PATCH api/v1/medicine/<id>/ deb
            // taxmin qildim — agar boshqacha bo'lsa shu qatorni almashtiring.
            const url = editingId ? `${api}/medicine/${editingId}/` : `${api}/medicine/create/`
            const method = editingId ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: authHeaders(token),
                body: buildFormBody(payload),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setFormError(
                    data?.name?.[0] || data?.detail || data?.message || "Saqlashda xatolik yuz berdi"
                )
                return
            }

            setModalOpen(false)
            showToast('success', editingId ? 'Dori yangilandi' : "Yangi dori qo'shildi")
            fetchMedicines()
        } catch (err) {
            setFormError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (medicine) => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/medicine/${medicine.id}/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: buildFormBody({ is_active: !medicine.is_active }),
            })
            if (!res.ok) throw new Error()
            setMedicines(prev => prev.map(m => m.id === medicine.id ? { ...m, is_active: !m.is_active } : m))
        } catch {
            showToast('error', "Holatni o'zgartirishda xatolik yuz berdi")
        }
    }

    // ---------- Dorini o'chirish (tasdiqlash modali) ----------

    const askDelete = (medicine) => {
        setDeleteTarget(medicine)
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
            const res = await fetch(`${api}/medicine/${deleteTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error()
            setMedicines(prev => prev.filter(m => m.id !== deleteTarget.id))
            setDeleteTarget(null)
            showToast('success', "Dori o'chirildi")
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
                    <h2>Dorilar</h2>
                    <p className={s.subtitle}>Klinika dorixonasidagi dori-darmonlar va narxlarini boshqarish</p>
                </div>
                <button className={s.primaryBtn} onClick={openCreateModal}>
                    <i className="bi bi-plus-lg"></i> Dori qo'shish
                </button>
            </div>

            <div className={s.searchRow}>
                <div className={s.searchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Dori nomi bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && <p className={s.loading}>Yuklanmoqda...</p>}
            {error && <p className={s.loading}>Xatolik: {error}</p>}

            {!loading && !error && filtered.length === 0 && (
                <p className={s.empty}>Hech qanday dori topilmadi</p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>T/R</th>
                                <th>Nomi</th>
                                <th>Tavsif</th>
                                <th>Narxi</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((m, index) => (
                                <tr key={m.id}>
                                    <td className={s.nameCell}>{index+1}.</td>
                                    <td className={s.nameCell}>{m.name}</td>
                                    <td className={s.descCell}>{m.description || '—'}</td>
                                    <td>{formatSum(m.price)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`${s.statusToggle} ${m.is_active ? s.active : s.inactive}`}
                                            onClick={() => toggleActive(m)}
                                        >
                                            <i className={`bi ${m.is_active ? 'bi-check-circle-fill' : 'bi-slash-circle'}`}></i>
                                            {m.is_active ? 'Faol' : 'Nofaol'}
                                        </button>
                                    </td>
                                    <td className={s.rowActions}>
                                        <button type="button" title="Tahrirlash" onClick={() => openEditModal(m)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className={s.dangerIcon}
                                            onClick={() => askDelete(m)}
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

            {/* Dori qo'shish / tahrirlash */}
            <Modal isOpen={modalOpen} onClose={closeModal}>
                <div className={s.modalContent}>
                    <h3>{editingId ? 'Dorini tahrirlash' : "Yangi dori qo'shish"}</h3>

                    <form onSubmit={handleSubmit}>
                        <label>
                            Nomi *
                            <input
                                type="text"
                                placeholder="Masalan: Parastamol"
                                value={form.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <label>
                            Tavsif
                            <textarea
                                rows={3}
                                placeholder="Masalan: Bosh og'rig'ini qoldiruvchi dori"
                                value={form.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <label>
                            Narxi (so'm) *
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0"
                                value={form.price}
                                onChange={(e) => handleFieldChange('price', e.target.value)}
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
                            Dori faol
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

            {/* Dorini o'chirishni tasdiqlash */}
            <Modal isOpen={!!deleteTarget} onClose={closeDeleteModal}>
                <div className={s.confirmContent}>
                    <h3>Dorini o'chirish</h3>
                    <p>
                        {deleteTarget && (
                            <>"{deleteTarget.name}" dorisini o'chirishni tasdiqlaysizmi?</>
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

export default AdminMedicines