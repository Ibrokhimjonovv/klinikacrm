import React, { useEffect, useRef, useState } from 'react';
import s from './AdminServices.module.scss';
// ⚠️ Fayllar qaysi papkada joylashishiga qarab yo'llarni to'g'rilang:
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const formatSum = (n) => Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm"

const emptyForm = { name: '', description: '', price: '', duration_minutes: '', is_active: true }

const AdminServices = () => {
    const [services, setServices] = useState([])
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

    // ---- Xizmatga xodim (shifokor) biriktirish ----
    // ⚠️ "/doctors/assists/" endpoint mavjudligi taxmin qilindi, javob
    // {id, first_name, last_name, specialty} ko'rinishida bo'lishi kutiladi
    // (agar boshqacha bo'lsa, doctorLabel() funksiyasini moslang).
    const [doctors, setDoctors] = useState([])
    const [doctorsLoading, setDoctorsLoading] = useState(true)

    const [assignments, setAssignments] = useState([]) // barcha service-employee yozuvlari
    const [assignmentsLoading, setAssignmentsLoading] = useState(true)

    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [assignService, setAssignService] = useState(null)
    const [selectedDoctorId, setSelectedDoctorId] = useState('')
    const [assignSaving, setAssignSaving] = useState(false)
    const [assignError, setAssignError] = useState('')

    const [removeTarget, setRemoveTarget] = useState(null)
    const [removing, setRemoving] = useState(false)

    const fetchDoctors = async () => {
        try {
            setDoctorsLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/doctors/assists/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setDoctors(list)
        } catch (err) {
            console.error('Shifokorlar ro\'yxatini olishda xatolik:', err)
        } finally {
            setDoctorsLoading(false)
        }
    }

    const fetchAssignments = async () => {
        try {
            setAssignmentsLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/service-employees/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setAssignments(list)
        } catch (err) {
            console.error('Biriktirilgan xodimlarni olishda xatolik:', err)
        } finally {
            setAssignmentsLoading(false)
        }
    }

    // service/employee maydonlari backendda id yoki to'liq object bo'lib kelishi mumkin — ikkisini ham qo'llab-quvvatlaymiz
    const serviceIdOf = (assignment) => {
        return typeof assignment.service === 'object'
            ? assignment.service?.id
            : assignment.service
    }

    const employeeIdOf = (assignment) => {
        return typeof assignment.employee === 'object'
            ? assignment.employee?.id
            : assignment.employee
    }

    const getEmployeeDoctor = (assignment) => {
        // Backend employee_detail orqali doktor ma'lumotlarini yuboryapti
        if (assignment?.employee_detail) {
            return assignment.employee_detail
        }

        // Agar keyinchalik employee object ko'rinishida kelsa
        if (typeof assignment?.employee === 'object') {
            return assignment.employee
        }

        // Fallback: doctors endpointidan qidirish
        return doctors.find(
            doctor => Number(doctor.id) === Number(assignment?.employee)
        ) || null
    }

    const doctorLabel = (doctor) => {
        if (!doctor) return 'Nomaʼlum xodim'

        // service-employees dagi employee_detail
        if (doctor.full_name) {
            return doctor.full_name
        }

        // /doctors/ endpointidan keladigan format
        const fullName = [
            doctor.first_name,
            doctor.last_name,
            doctor.middle_name,
        ]
            .filter(Boolean)
            .join(' ')
            .trim()

        return (
            fullName ||
            doctor.name ||
            doctor.username ||
            `Xodim #${doctor.id}`
        )
    }

    const assignmentsForService = assignService
        ? assignments.filter(a => serviceIdOf(a) === assignService.id)
        : []

    const openAssignModal = (service) => {
        setAssignService(service)
        setSelectedDoctorId('')
        setAssignError('')
        setAssignModalOpen(true)
    }

    const closeAssignModal = () => {
        if (assignSaving) return
        setAssignModalOpen(false)
    }

    const handleAddAssignment = async (e) => {
        e.preventDefault()
        setAssignError('')

        if (!selectedDoctorId) {
            setAssignError("Shifokorni tanlang")
            return
        }
        const alreadyAssigned = assignmentsForService.some(a => employeeIdOf(a) === Number(selectedDoctorId))
        if (alreadyAssigned) {
            setAssignError("Bu shifokor bu xizmatga allaqachon biriktirilgan")
            return
        }

        setAssignSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/service-employees/`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    service: assignService.id,
                    employee: Number(selectedDoctorId),
                    is_active: true,
                }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setAssignError(
                    data?.non_field_errors?.[0] || data?.detail || data?.message || "Biriktirishda xatolik yuz berdi"
                )
                return
            }

            setAssignments(prev => [...prev, data])
            setSelectedDoctorId('')
            showToast('success', "Shifokor xizmatga biriktirildi")
        } catch (err) {
            setAssignError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setAssignSaving(false)
        }
    }

    const toggleAssignmentActive = async (assignment) => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/service-employees/${assignment.id}/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ is_active: !assignment.is_active }),
            })
            if (!res.ok) throw new Error()
            setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, is_active: !a.is_active } : a))
        } catch {
            showToast('error', "Holatni o'zgartirishda xatolik yuz berdi")
        }
    }

    // ---------- Biriktirishni uzish (tasdiqlash modali) ----------

    const askRemoveAssignment = (assignment) => {
        setRemoveTarget(assignment)
    }

    const closeRemoveModal = () => {
        if (removing) return
        setRemoveTarget(null)
    }

    const confirmRemoveAssignment = async () => {
        if (!removeTarget) return
        setRemoving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/service-employees/${removeTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setAssignments(prev => prev.filter(a => a.id !== removeTarget.id))
            setRemoveTarget(null)
            showToast('success', "Shifokor xizmatdan uzildi")
        } catch {
            showToast('error', "O'chirishda xatolik yuz berdi")
        } finally {
            setRemoving(false)
        }
    }

    const fetchServices = async () => {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/services/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setServices(list)
        } catch (err) {
            console.error('Xizmatlarni olishda xatolik:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServices()
        fetchDoctors()
        fetchAssignments()
    }, [])

    const filtered = services.filter(sv =>
        sv.name?.toLowerCase().includes(search.toLowerCase())
    )

    const openCreateModal = () => {
        setEditingId(null)
        setForm(emptyForm)
        setFormError('')
        setModalOpen(true)
    }

    const openEditModal = (service) => {
        setEditingId(service.id)
        setForm({
            name: service.name || '',
            description: service.description || '',
            price: service.price ?? '',
            duration_minutes: service.duration_minutes ?? '',
            is_active: !!service.is_active,
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
            setFormError("Xizmat nomi kiritilishi shart")
            return
        }
        if (form.price === '' || Number(form.price) < 0) {
            setFormError("Narx to'g'ri kiritilishi shart")
            return
        }
        if (form.duration_minutes === '' || Number(form.duration_minutes) < 0) {
            setFormError("Davomiylik (daqiqa) to'g'ri kiritilishi shart")
            return
        }

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            duration_minutes: Number(form.duration_minutes),
            is_active: form.is_active,
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const url = editingId ? `${api}/services/${editingId}/` : `${api}/services/`
            const method = editingId ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: authHeaders(token),
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                setFormError(
                    data?.name?.[0] || data?.detail || data?.message || "Saqlashda xatolik yuz berdi"
                )
                return
            }

            setModalOpen(false)
            showToast('success', editingId ? 'Xizmat yangilandi' : "Yangi xizmat qo'shildi")
            fetchServices()
        } catch (err) {
            setFormError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (service) => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/services/${service.id}/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ is_active: !service.is_active }),
            })
            if (!res.ok) throw new Error()
            setServices(prev => prev.map(sv => sv.id === service.id ? { ...sv, is_active: !sv.is_active } : sv))
        } catch {
            showToast('error', "Holatni o'zgartirishda xatolik yuz berdi")
        }
    }

    // ---------- Xizmatni o'chirish (tasdiqlash modali) ----------

    const askDelete = (service) => {
        setDeleteTarget(service)
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
            const res = await fetch(`${api}/services/${deleteTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setServices(prev => prev.filter(sv => sv.id !== deleteTarget.id))
            setDeleteTarget(null)
            showToast('success', "Xizmat o'chirildi")
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
                    <h2>Xizmatlar</h2>
                    <p className={s.subtitle}>Klinika xizmatlari va narxlarini boshqarish</p>
                </div>
                <button className={s.primaryBtn} onClick={openCreateModal}>
                    <i className="bi bi-plus-lg"></i> Xizmat qo'shish
                </button>
            </div>

            <div className={s.searchRow}>
                <div className={s.searchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Xizmat nomi bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && <p className={s.loading}>Yuklanmoqda...</p>}
            {error && <p className={s.loading}>Xatolik: {error}</p>}

            {!loading && !error && filtered.length === 0 && (
                <p className={s.empty}>Hech qanday xizmat topilmadi</p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Nomi</th>
                                <th>Tavsif</th>
                                <th>Narxi</th>
                                <th>Davomiyligi</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((sv) => (
                                <tr key={sv.id}>
                                    <td className={s.nameCell}>{sv.name}</td>
                                    <td className={s.descCell}>{sv.description || '—'}</td>
                                    <td>{formatSum(sv.price)}</td>
                                    <td>{sv.duration_minutes} daqiqa</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`${s.statusToggle} ${sv.is_active ? s.active : s.inactive}`}
                                            onClick={() => toggleActive(sv)}
                                        >
                                            <i className={`bi ${sv.is_active ? 'bi-check-circle-fill' : 'bi-slash-circle'}`}></i>
                                            {sv.is_active ? 'Faol' : 'Nofaol'}
                                        </button>
                                    </td>
                                    <td className={s.rowActions}>
                                        <button type="button" title="Xodimlarni biriktirish" onClick={() => openAssignModal(sv)}>
                                            <i className="bi bi-people"></i>
                                        </button>
                                        <button type="button" title="Tahrirlash" onClick={() => openEditModal(sv)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className={s.dangerIcon}
                                            onClick={() => askDelete(sv)}
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

            {/* Xizmat qo'shish / tahrirlash */}
            <Modal isOpen={modalOpen} onClose={closeModal}>
                <div className={s.modalContent}>
                    <h3>{editingId ? 'Xizmatni tahrirlash' : "Yangi xizmat qo'shish"}</h3>

                    <form onSubmit={handleSubmit}>
                        <label>
                            Nomi *
                            <input
                                type="text"
                                placeholder="Masalan: Shifokor ko'rigi"
                                value={form.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <label>
                            Tavsif
                            <textarea
                                rows={3}
                                placeholder="Xizmat haqida qisqacha ma'lumot (ixtiyoriy)"
                                value={form.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <div className={s.fieldRow}>
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

                            <label>
                                Davomiyligi (daqiqa) *
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={form.duration_minutes}
                                    onChange={(e) => handleFieldChange('duration_minutes', e.target.value)}
                                    disabled={saving}
                                />
                            </label>
                        </div>

                        <label className={s.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                                disabled={saving}
                            />
                            Xizmat faol (bemorlarga ko'rinadi)
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

            {/* Xodimlarni biriktirish */}
            <Modal isOpen={assignModalOpen && !!assignService} onClose={closeAssignModal}>
                <div className={s.modalContent}>
                    <h3>Xodimlarni biriktirish</h3>

                    {assignService && (
                        <p className={s.assignSub}>Xizmat: <strong>{assignService.name}</strong></p>
                    )}

                    <div className={s.assignedList}>
                        {assignmentsLoading ? (
                            <p className={s.loading}>Yuklanmoqda...</p>
                        ) : assignmentsForService.length === 0 ? (
                            <p className={s.empty}>Hali hech kim biriktirilmagan</p>
                        ) : (
                            assignmentsForService.map((a) => {
                                const doctor = getEmployeeDoctor(a)

                                return (
                                    <div key={a.id} className={s.assignedRow}>
                                        <span className={s.assignedName}>
                                            {doctorLabel(doctor)}
                                        </span>

                                        <button
                                            type="button"
                                            className={`${s.statusToggle} ${a.is_active ? s.active : s.inactive}`}
                                            onClick={() => toggleAssignmentActive(a)}
                                        >
                                            <i className={`bi ${a.is_active ? 'bi-check-circle-fill' : 'bi-slash-circle'}`}></i>
                                            {a.is_active ? 'Faol' : 'Nofaol'}
                                        </button>

                                        <button
                                            type="button"
                                            className={s.dangerIcon}
                                            onClick={() => askRemoveAssignment(a)}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    <form className={s.assignForm} onSubmit={handleAddAssignment}>
                        <select
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            disabled={assignSaving || doctorsLoading}
                        >
                            <option value="">
                                {doctorsLoading ? "Shifokorlar yuklanmoqda..." : "Shifokorni tanlang..."}
                            </option>
                            {doctors.map((d) => (
                                <option key={d.id} value={d.id}>{doctorLabel(d)}</option>
                            ))}
                        </select>
                        <button type="submit" className={s.primaryBtn} disabled={assignSaving}>
                            <i className="bi bi-plus-lg"></i> {assignSaving ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                        </button>
                    </form>

                    {assignError && (
                        <p className={s.formError}>
                            <i className="bi bi-exclamation-circle-fill"></i> {assignError}
                        </p>
                    )}
                </div>
            </Modal>

            {/* Xizmatni o'chirishni tasdiqlash */}
            <Modal isOpen={!!deleteTarget} onClose={closeDeleteModal}>
                <div className={s.confirmContent}>
                    <h3>Xizmatni o'chirish</h3>
                    <p>
                        {deleteTarget && (
                            <>"{deleteTarget.name}" xizmatini o'chirishni tasdiqlaysizmi?</>
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

            {/* Xodimni xizmatdan uzishni tasdiqlash */}
            <Modal isOpen={!!removeTarget} onClose={closeRemoveModal}>
                <div className={s.confirmContent}>
                    <h3>Xodimni xizmatdan uzish</h3>
                    <p>Bu shifokorni xizmatdan uzishni tasdiqlaysizmi?</p>

                    <div className={s.modalActions}>
                        <button type="button" className={s.secondaryBtn} onClick={closeRemoveModal} disabled={removing}>
                            Bekor qilish
                        </button>
                        <button type="button" className={s.primaryBtn} onClick={confirmRemoveAssignment} disabled={removing}>
                            {removing ? "O'chirilmoqda..." : "Uzish"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default AdminServices