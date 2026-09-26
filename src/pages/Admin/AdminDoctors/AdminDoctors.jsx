import React, { useEffect, useRef, useState } from 'react';
import s from './AdminDoctors.module.scss';
// ⚠️ Fayllar qaysi papkada joylashishiga qarab yo'llarni to'g'rilang:
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';
import { IMaskInput } from 'react-imask';

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

// ✅ Maydon nomlari DoctorProfileSerializer'ga mos:
//   - specialty / department -> FK ID (yozish uchun), specialty_detail /
//     department_detail -> {id, name} (o'qish uchun)
//   - user -> majburiy FK (PATIENT bo'lmagan user)
//   - is_active -> serializerda YO'Q, shuning uchun yo'q
// ✅ user / specialty / department tanlash uchun select ro'yxatlari
// quyidagi endpointlardan olinadi:
//   GET /doctor-users/        -> [{ id, detail: "username (ROLE)" }, ...]
//   GET /departments-select/  -> [{ id, name/detail }, ...]
//   GET /specialties-select/  -> [{ id, name/detail }, ...]
// ℹ️ Yangilash (update) uchun PUT ishlatiladi (to'liq update), shuning
// uchun PUT yuborilayotganda barcha maydonlar (bo'sh bo'lsa ham) birga
// yuboriladi.

// Har xil shakldagi javoblarni ({name} yoki {detail}) bir xilga keltiradi
const optionLabel = (item) => item.detail || item.name || `#${item.id}`

const emptyForm = {
    user: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    specialty: '',
    department: '',
    experience_years: '',
    qualifications: '',
    contact_number: '',
    address: '',
}

const normalizeDoctor = (d) => ({
    id: d.id,
    user: d.user ?? d.user_detail?.id ?? null,
    user_detail: d.user_detail || null,
    first_name: d.first_name || '',
    last_name: d.last_name || '',
    middle_name: d.middle_name || '',
    specialty: d.specialty ?? d.specialty_detail?.id ?? '',
    specialty_name: d.specialty_detail?.name || '',
    department: d.department ?? d.department_detail?.id ?? '',
    department_name: d.department_detail?.name || '',
    experience_years: d.experience_years ?? '',
    qualifications: d.qualifications || '',
    contact_number: d.contact_number || '',
    address: d.address || '',
    profile_image: d.profile_image || null,
})

const fullName = (d) => [d.first_name, d.last_name, d.middle_name].filter(Boolean).join(' ').trim() || `Xodim #${d.id}`

const AdminDoctors = () => {
    const [doctors, setDoctors] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [search, setSearch] = useState('')

    // ---------- Select ro'yxatlari: userlar, bo'limlar, mutaxassisliklar ----------
    const [doctorUsers, setDoctorUsers] = useState([])
    const [departmentOptions, setDepartmentOptions] = useState([])
    const [specialtyOptions, setSpecialtyOptions] = useState([])

    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null) // null => yangi qo'shish, aks holda tahrirlash
    const [form, setForm] = useState(emptyForm)
    const [imageFile, setImageFile] = useState(null) // yangi tanlangan rasm (agar bo'lsa)

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

    const fetchDoctors = async () => {
        try {
            setLoading(true)
            setError(null)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/doctor-profiles/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setDoctors(list.map(normalizeDoctor))
        } catch (err) {
            console.error('Shifokorlar ro\'yxatini olishda xatolik:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchDoctorUsers = async (token) => {
        try {
            const res = await fetch(`${api}/doctor-users/`, { headers: authHeaders(token) })
            if (!res.ok) return
            const data = await res.json()
            setDoctorUsers(Array.isArray(data) ? data : data.results || [])
        } catch {
            // jimgina o'tkazib yuboriladi — select bo'sh qoladi
        }
    }

    const fetchDepartmentOptions = async (token) => {
        try {
            const res = await fetch(`${api}/departments-select/`, { headers: authHeaders(token) })
            if (!res.ok) return
            const data = await res.json()
            setDepartmentOptions(Array.isArray(data) ? data : data.results || [])
        } catch {
            // jimgina o'tkazib yuboriladi
        }
    }

    const fetchSpecialtyOptions = async (token) => {
        try {
            const res = await fetch(`${api}/specialties-select/`, { headers: authHeaders(token) })
            if (!res.ok) return
            const data = await res.json()
            setSpecialtyOptions(Array.isArray(data) ? data : data.results || [])
        } catch {
            // jimgina o'tkazib yuboriladi
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('hospital_access')
        fetchDoctors()
        fetchDoctorUsers(token)
        fetchDepartmentOptions(token)
        fetchSpecialtyOptions(token)
    }, [])

    // specialty_detail/department_detail bo'lmasa, select ro'yxatidan nom topamiz
    const specialtyLabel = (d) => d.specialty_name || (
        specialtyOptions.find(o => String(o.id) === String(d.specialty))
            ? optionLabel(specialtyOptions.find(o => String(o.id) === String(d.specialty)))
            : ''
    )
    const departmentLabel = (d) => d.department_name || (
        departmentOptions.find(o => String(o.id) === String(d.department))
            ? optionLabel(departmentOptions.find(o => String(o.id) === String(d.department)))
            : ''
    )

    const filtered = doctors.filter(d =>
        fullName(d).toLowerCase().includes(search.toLowerCase()) ||
        specialtyLabel(d).toLowerCase().includes(search.toLowerCase())
    )

    // ---------- Create / edit modal ----------

    const openCreateModal = () => {
        setEditingId(null)
        setForm(emptyForm)
        setImageFile(null)
        setFormError('')
        setModalOpen(true)
    }

    const openEditModal = (doctor) => {
        setEditingId(doctor.id)
        setForm({
            user: doctor.user || '',
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            middle_name: doctor.middle_name,
            specialty: doctor.specialty || '',
            department: doctor.department || '',
            experience_years: doctor.experience_years ?? '',
            qualifications: doctor.qualifications || '',
            contact_number: doctor.contact_number || '',
            address: doctor.address || '',
        })
        setImageFile(null)
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

    const buildPayload = () => ({
        user: form.user || null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name.trim(),
        specialty: form.specialty || null,
        department: form.department || null,
        experience_years: form.experience_years === '' ? null : Number(form.experience_years),
        qualifications: form.qualifications.trim(),
        contact_number: form.contact_number.trim(),
        address: form.address.trim(),
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFormError('')

        if (!form.first_name.trim() || !form.last_name.trim()) {
            setFormError("Ism va familiya kiritilishi shart")
            return
        }
        if (!form.user) {
            setFormError("Foydalanuvchi (user) tanlanishi shart")
            return
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const url = editingId ? `${api}/doctor-profiles/${editingId}/` : `${api}/doctor-profiles/`
            // Yangi qo'shishda POST, tahrirlashda to'liq update sifatida PUT
            const method = editingId ? 'PUT' : 'POST'

            let res
            if (imageFile) {
                // Rasm bilan yuborilganda multipart/form-data ishlatiladi
                const fd = new FormData()
                const payload = buildPayload()
                Object.entries(payload).forEach(([key, val]) => {
                    if (val !== null && val !== undefined) fd.append(key, val)
                })
                fd.append('profile_image', imageFile)

                res = await fetch(url, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}` }, // Content-Type qo'yilmaydi, brauzer o'zi qo'yadi
                    body: fd,
                })
            } else {
                res = await fetch(url, {
                    method,
                    headers: authHeaders(token),
                    body: JSON.stringify(buildPayload()),
                })
            }

            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                const firstErrorField = Object.keys(data || {})[0]
                setFormError(
                    data?.detail ||
                    data?.message ||
                    (firstErrorField ? `${firstErrorField}: ${[].concat(data[firstErrorField])[0]}` : "Saqlashda xatolik yuz berdi")
                )
                return
            }

            setModalOpen(false)
            showToast('success', editingId ? 'Shifokor ma\'lumotlari yangilandi' : "Yangi shifokor qo'shildi")
            fetchDoctors()
        } catch (err) {
            setFormError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setSaving(false)
        }
    }

    // ---------- Delete confirm modal ----------

    const askDelete = (doctor) => {
        setDeleteTarget(doctor)
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
            const res = await fetch(`${api}/doctor-profiles/${deleteTarget.id}/`, {
                method: 'DELETE',
                headers: authHeaders(token, false),
            })
            if (!res.ok) throw new Error()
            setDoctors(prev => prev.filter(d => d.id !== deleteTarget.id))
            setDeleteTarget(null)
            showToast('success', "Shifokor o'chirildi")
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
                    <h2>Shifokorlar</h2>
                    <p className={s.subtitle}>Klinika shifokorlari ro'yxatini boshqarish</p>
                </div>
                <button className={s.primaryBtn} onClick={openCreateModal}>
                    <i className="bi bi-plus-lg"></i> Shifokor qo'shish
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
                <p className={s.empty}>Hech qanday shifokor topilmadi</p>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>F.I.O</th>
                                <th>Mutaxassislik</th>
                                <th>Bo'lim</th>
                                <th>Tajriba (yil)</th>
                                <th>Telefon</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((d) => (
                                <tr key={d.id}>
                                    <td>
                                        <div className={s.nameWrap}>
                                            <div className={s.avatar}>
                                                {d.profile_image ? (
                                                    <img src={d.profile_image} alt={fullName(d)} className={s.avatarImg} />
                                                ) : (
                                                    d.first_name ? d.first_name[0].toUpperCase() : '?'
                                                )}
                                            </div>
                                            <span className={s.nameText}>{fullName(d)}</span>
                                        </div>
                                    </td>
                                    <td>{specialtyLabel(d) || '—'}</td>
                                    <td>{departmentLabel(d) || '—'}</td>
                                    <td>{d.experience_years !== '' && d.experience_years !== null ? d.experience_years : '—'}</td>
                                    <td>{d.contact_number || '—'}</td>
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

            {/* Shifokor qo'shish / tahrirlash */}
            <Modal isOpen={modalOpen} onClose={closeModal}>
                <div className={s.modalContent}>
                    <h3>{editingId ? 'Shifokorni tahrirlash' : "Yangi shifokor qo'shish"}</h3>

                    <form onSubmit={handleSubmit}>
                        <label>
                            Foydalanuvchi (user) *
                            <select
                                value={form.user}
                                onChange={(e) => handleFieldChange('user', e.target.value)}
                                disabled={saving}
                            >
                                <option value="">— Tanlang —</option>
                                {doctorUsers.map(u => (
                                    <option key={u.id} value={u.id}>{optionLabel(u)}</option>
                                ))}
                            </select>
                        </label>

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
                                <select
                                    value={form.specialty}
                                    onChange={(e) => handleFieldChange('specialty', e.target.value)}
                                    disabled={saving}
                                >
                                    <option value="">— Tanlanmagan —</option>
                                    {specialtyOptions.map(sp => (
                                        <option key={sp.id} value={sp.id}>{optionLabel(sp)}</option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Bo'lim
                                <select
                                    value={form.department}
                                    onChange={(e) => handleFieldChange('department', e.target.value)}
                                    disabled={saving}
                                >
                                    <option value="">— Tanlanmagan —</option>
                                    {departmentOptions.map(dep => (
                                        <option key={dep.id} value={dep.id}>{optionLabel(dep)}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className={s.fieldRow}>
                            <label>
                                Tajriba (yil)
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Masalan: 5"
                                    value={form.experience_years}
                                    onChange={(e) => handleFieldChange('experience_years', e.target.value)}
                                    disabled={saving}
                                />
                            </label>

                            <label>
                                Telefon
                                {/* <input
                                    type="text"
                                    placeholder="+998 90 123 45 67"
                                    value={form.contact_number}
                                    onChange={(e) => handleFieldChange('contact_number', e.target.value)}
                                    disabled={saving}
                                /> */}
                                <IMaskInput
                                    mask="+998 00 000 00 00"
                                    name="contact_number"
                                    placeholder="+998 XX XXX XX XX"
                                    value={form.contact_number}
                                    unmask={false}
                                    lazy={false}
                                    overwrite
                                    onAccept={(value) => handleFieldChange('contact_number', value)}
                                    disabled={saving}
                                />
                            </label>
                        </div>

                        <label>
                            Malaka / kvalifikatsiya
                            <textarea
                                rows={2}
                                placeholder="Masalan: Oliy toifali shifokor, ..."
                                value={form.qualifications}
                                onChange={(e) => handleFieldChange('qualifications', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <label>
                            Manzil
                            <input
                                type="text"
                                placeholder="Manzil"
                                value={form.address}
                                onChange={(e) => handleFieldChange('address', e.target.value)}
                                disabled={saving}
                            />
                        </label>

                        <label>
                            Profil rasmi
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                disabled={saving}
                            />
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
                    <h3>Shifokorni o'chirish</h3>
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

export default AdminDoctors