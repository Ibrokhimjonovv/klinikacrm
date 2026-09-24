import React, { useEffect, useState } from 'react';
import s from './AdminServices.module.scss';
// ⚠️ Fayl qaysi papkada joylashishiga qarab shu yo'lni to'g'rilang (masalan '../../App'):
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

    const [deletingId, setDeletingId] = useState(null)

    // ---- Xizmatga xodim (shifokor) biriktirish ----
    // ⚠️ "/doctors/" endpoint mavjudligi taxmin qilindi, javob {id, first_name, last_name, specialty}
    // ko'rinishida bo'lishi kutiladi (agar boshqacha bo'lsa, doctorLabel() funksiyasini moslang).
    const [doctors, setDoctors] = useState([])
    const [doctorsLoading, setDoctorsLoading] = useState(true)

    const [assignments, setAssignments] = useState([]) // barcha service-employee yozuvlari
    const [assignmentsLoading, setAssignmentsLoading] = useState(true)

    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [assignService, setAssignService] = useState(null)
    const [selectedDoctorId, setSelectedDoctorId] = useState('')
    const [assignSaving, setAssignSaving] = useState(false)
    const [assignError, setAssignError] = useState('')

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
            alert("Holatni o'zgartirishda xatolik yuz berdi")
        }
    }

    const removeAssignment = async (assignment) => {
        if (!window.confirm("Bu shifokorni xizmatdan uzishni tasdiqlaysizmi?")) return
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/service-employees/${assignment.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setAssignments(prev => prev.filter(a => a.id !== assignment.id))
        } catch {
            alert("O'chirishda xatolik yuz berdi")
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
            alert("Holatni o'zgartirishda xatolik yuz berdi")
        }
    }

    const handleDelete = async (service) => {
        if (!window.confirm(`"${service.name}" xizmatini o'chirishni tasdiqlaysizmi?`)) return

        setDeletingId(service.id)
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/services/${service.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setServices(prev => prev.filter(sv => sv.id !== service.id))
        } catch {
            alert("O'chirishda xatolik yuz berdi")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className={s.Page}>
            <div className={s.TopRow}>
                <div>
                    <h1>Xizmatlar</h1>
                    <p>Klinika xizmatlari va narxlarini boshqarish</p>
                </div>
                <button className={s.AddBtn} onClick={openCreateModal}>
                    <i className="bi bi-plus-lg"></i> Xizmat qo'shish
                </button>
            </div>

            <div className={s.SearchRow}>
                <div className={s.SearchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Xizmat nomi bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && <p className={s.State}>Yuklanmoqda...</p>}
            {error && <p className={s.State}>Xatolik: {error}</p>}

            {!loading && !error && filtered.length === 0 && (
                <p className={s.Empty}>Hech qanday xizmat topilmadi</p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className={s.TableWrap}>
                    <table className={s.Table}>
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
                                    <td className={s.NameCell}>{sv.name}</td>
                                    <td className={s.DescCell}>{sv.description || '—'}</td>
                                    <td>{formatSum(sv.price)}</td>
                                    <td>{sv.duration_minutes} daqiqa</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={`${s.StatusToggle} ${sv.is_active ? s.active : s.inactive}`}
                                            onClick={() => toggleActive(sv)}
                                        >
                                            <i className={`bi ${sv.is_active ? 'bi-check-circle-fill' : 'bi-slash-circle'}`}></i>
                                            {sv.is_active ? 'Faol' : 'Nofaol'}
                                        </button>
                                    </td>
                                    <td className={s.ActionsCell}>
                                        <button type="button" className={s.IconBtn} title="Xodimlarni biriktirish" onClick={() => openAssignModal(sv)}>
                                            <i className="bi bi-people"></i>
                                        </button>
                                        <button type="button" className={s.IconBtn} title="Tahrirlash" onClick={() => openEditModal(sv)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className={`${s.IconBtn} ${s.danger}`}
                                            onClick={() => handleDelete(sv)}
                                            disabled={deletingId === sv.id}
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

            {modalOpen && (
                <div className={s.ModalOverlay} onClick={closeModal}>
                    <div className={s.Modal} onClick={(e) => e.stopPropagation()}>
                        <div className={s.ModalHead}>
                            <h2>{editingId ? 'Xizmatni tahrirlash' : 'Yangi xizmat qo\'shish'}</h2>
                            <button type="button" className={s.CloseBtn} onClick={closeModal} disabled={saving}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={s.Field}>
                                <label>Nomi *</label>
                                <input
                                    type="text"
                                    placeholder="Masalan: Shifokor ko'rigi"
                                    value={form.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <div className={s.Field}>
                                <label>Tavsif</label>
                                <textarea
                                    rows={3}
                                    placeholder="Xizmat haqida qisqacha ma'lumot (ixtiyoriy)"
                                    value={form.description}
                                    onChange={(e) => handleFieldChange('description', e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            <div className={s.FieldRow}>
                                <div className={s.Field}>
                                    <label>Narxi (so'm) *</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0"
                                        value={form.price}
                                        onChange={(e) => handleFieldChange('price', e.target.value)}
                                        disabled={saving}
                                    />
                                </div>

                                <div className={s.Field}>
                                    <label>Davomiyligi (daqiqa) *</label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={form.duration_minutes}
                                        onChange={(e) => handleFieldChange('duration_minutes', e.target.value)}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <label className={s.CheckboxRow}>
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                                    disabled={saving}
                                />
                                Xizmat faol (bemorlarga ko'rinadi)
                            </label>

                            {formError && (
                                <p className={s.FormError}>
                                    <i className="bi bi-exclamation-circle-fill"></i> {formError}
                                </p>
                            )}

                            <div className={s.ModalActions}>
                                <button type="button" className={s.CancelBtn} onClick={closeModal} disabled={saving}>
                                    Bekor qilish
                                </button>
                                <button type="submit" className={s.SaveBtn} disabled={saving}>
                                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {assignModalOpen && assignService && (
                <div className={s.ModalOverlay} onClick={closeAssignModal}>
                    <div className={s.Modal} onClick={(e) => e.stopPropagation()}>
                        <div className={s.ModalHead}>
                            <h2>Xodimlarni biriktirish</h2>
                            <button type="button" className={s.CloseBtn} onClick={closeAssignModal} disabled={assignSaving}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <p className={s.AssignSub}>Xizmat: <strong>{assignService.name}</strong></p>

                        <div className={s.AssignedList}>
                            {assignmentsLoading ? (
                                <p className={s.State}>Yuklanmoqda...</p>
                            ) : assignmentsForService.length === 0 ? (
                                <p className={s.Empty}>Hali hech kim biriktirilmagan</p>
                            ) : (
                                assignmentsForService.map((a) => {
                                    const doctor = getEmployeeDoctor(a)

                                    return (
                                        <div key={a.id} className={s.AssignedRow}>
                                            <span className={s.AssignedName}>
                                                {doctorLabel(doctor)}
                                            </span>

                                            <button
                                                type="button"
                                                className={`${s.StatusToggle} ${a.is_active ? s.active : s.inactive
                                                    }`}
                                                onClick={() => toggleAssignmentActive(a)}
                                            >
                                                <i
                                                    className={`bi ${a.is_active
                                                            ? 'bi-check-circle-fill'
                                                            : 'bi-slash-circle'
                                                        }`}
                                                ></i>

                                                {a.is_active ? 'Faol' : 'Nofaol'}
                                            </button>

                                            <button
                                                type="button"
                                                className={`${s.IconBtn} ${s.danger}`}
                                                onClick={() => removeAssignment(a)}
                                            >
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <form className={s.AssignForm} onSubmit={handleAddAssignment}>
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
                            <button type="submit" className={s.AddBtn} disabled={assignSaving}>
                                <i className="bi bi-plus-lg"></i> {assignSaving ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                            </button>
                        </form>

                        {assignError && (
                            <p className={s.FormError}>
                                <i className="bi bi-exclamation-circle-fill"></i> {assignError}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminServices