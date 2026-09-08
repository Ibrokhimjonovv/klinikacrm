import React, { useState } from 'react';
import s from './PatientAdmission.module.scss';
import Loading from '../../../components/Loading/Loading';
import { api } from '../../../App';
import VisitForm from '../../shared/VisitForm/VisitForm';
import { IMaskInput } from 'react-imask';
import { useAppContext } from '../../../context/context';

const STEPS = ['Bemor ma\'lumotlari', 'Kirish ma\'lumotlari', 'Shikoyat']

const PatientAdmission = ({ onSuccess }) => {
    const [step, setStep] = useState(1)
    const { addPatientLocally } = useAppContext()

    // STEP 1
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', middle_name: '',
        date_of_birth: '', gender: '', contact_number: '', address: '',
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')

    // STEP 2
    const [credentials, setCredentials] = useState(null)
    const [patientId, setPatientId] = useState(null)
    const [copied, setCopied] = useState('')

    // STEP 3 — endi doctors massiv (bir nechta tanlash mumkin)
    const [visitData, setVisitData] = useState({
        doctors: [],
        complaint: '',
        status: 'WAITING',
        notes: '',
    })
    const [visitErrors, setVisitErrors] = useState({})
    const [visitLoading, setVisitLoading] = useState(false)
    const [visitServerError, setVisitServerError] = useState('')
    const [finished, setFinished] = useState(false)

    // ---------- STEP 1 handlers (o'zgarishsiz) ----------

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    }

    const validateStep1 = () => {
        const newErrors = {}
        if (!formData.first_name.trim()) newErrors.first_name = "Ism kiritilishi shart"
        if (!formData.last_name.trim()) newErrors.last_name = "Familiya kiritilishi shart"
        if (!formData.date_of_birth) newErrors.date_of_birth = "Tug'ilgan sana kiritilishi shart"
        if (!formData.gender) newErrors.gender = "Jinsi tanlanishi shart"
        if (!formData.contact_number.trim()) {
            newErrors.contact_number = "Telefon raqami kiritilishi shart"
        } else if (!/^\+?\d{9,13}$/.test(formData.contact_number.replace(/\s/g, ''))) {
            newErrors.contact_number = "Telefon raqami noto'g'ri formatda"
        }
        if (!formData.address.trim()) newErrors.address = "Manzil kiritilishi shart"
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmitStep1 = async (e) => {
        e.preventDefault()
        setServerError('')
        if (!validateStep1()) return

        setLoading(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const body = new FormData()
            Object.entries(formData).forEach(([key, value]) => body.append(key, value))

            const res = await fetch(`${api}/patientAdd/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body,
            })
            const data = await res.json()

            if (!res.ok) {
                setServerError(data?.detail || "Bemorni saqlashda xatolik yuz berdi")
                return
            }

            setPatientId(data?.id)
            setCredentials({ username: data.username, password: data.generated_password })

            // MUHIM: formData'dan (biz allaqachon bilgan ma'lumotlar) + backend id'sini birlashtirib beramiz
            // Backend javobi ba'zi fieldlarni qaytarmasligi mumkin, shuning uchun formData asosiy manba
            addPatientLocally({
                ...formData,
                id: data?.id,
                create_date: new Date().toISOString(),
                complaints: [],
            })

            setStep(2)

        } catch (err) {
            setServerError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setLoading(false)
        }
    }

    // ---------- STEP 2 ----------

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text)
        setCopied(field)
        setTimeout(() => setCopied(''), 1500)
    }

    // ---------- STEP 3 — VisitForm orqali ----------

    const validateStep3 = () => {
        const newErrors = {}
        if (visitData.doctors.length === 0) newErrors.doctors = "Kamida bitta shifokor tanlanishi shart"
        if (!visitData.complaint.trim()) newErrors.complaint = "Shikoyat kiritilishi shart"
        setVisitErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmitStep3 = async (e) => {
        e.preventDefault()
        setVisitServerError('')
        if (!validateStep3()) return

        setVisitLoading(true)
        try {
            const token = localStorage.getItem('hospital_access')
            const body = new FormData()
            body.append('patient', patientId)
            visitData.doctors.forEach(id => body.append('doctors', id))
            body.append('complaint', visitData.complaint)
            body.append('status', visitData.status)
            body.append('notes', visitData.notes)

            const res = await fetch(`${api}/medicalVisit/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body,
            })
            const data = await res.json()

            if (!res.ok) {
                setVisitServerError(data?.message || data?.detail || "Saqlashda xatolik yuz berdi")
                return
            }

            setFinished(true)
            setTimeout(() => { if (onSuccess) onSuccess() }, 1500)

        } catch (err) {
            setVisitServerError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setVisitLoading(false)
        }
    }

    return (
        <section className={s.AdmissionSection}>

            <div className={s.StepHeader}>
                <h1>Bemorni qabul qilish</h1>
                <div className={s.StepIndicator}>
                    {STEPS.map((label, i) => {
                        const num = i + 1
                        const isActive = step === num
                        const isDone = step > num
                        return (
                            <React.Fragment key={num}>
                                <div className={s.StepItem}>
                                    <div className={`${s.StepCircle} ${isActive ? s.active : ''} ${isDone ? s.done : ''}`}>
                                        {isDone ? <i className="bi bi-check-lg"></i> : num}
                                    </div>
                                    <span className={isActive ? s.activeLabel : ''}>{label}</span>
                                </div>
                                {num < STEPS.length && <div className={`${s.StepLine} ${isDone ? s.done : ''}`}></div>}
                            </React.Fragment>
                        )
                    })}
                </div>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
                <form className={s.AdmissionForm} onSubmit={handleSubmitStep1} noValidate>
                    <div className={s.Row}>
                        <div className={s.Input}>
                            <p>Ism *</p>
                            <input type="text" name="first_name" placeholder="Ism"
                                value={formData.first_name} onChange={handleChange} disabled={loading} />
                            {errors.first_name && <span className={s.ErrorText}>{errors.first_name}</span>}
                        </div>
                        <div className={s.Input}>
                            <p>Familiya *</p>
                            <input type="text" name="last_name" placeholder="Familiya"
                                value={formData.last_name} onChange={handleChange} disabled={loading} />
                            {errors.last_name && <span className={s.ErrorText}>{errors.last_name}</span>}
                        </div>
                        <div className={s.Input}>
                            <p>Sharif</p>
                            <input type="text" name="middle_name" placeholder="Sharif"
                                value={formData.middle_name} onChange={handleChange} disabled={loading} />
                        </div>
                    </div>

                    <div className={s.Row}>
                        <div className={s.Input}>
                            <p>Tug'ilgan sana *</p>
                            <input type="date" name="date_of_birth"
                                value={formData.date_of_birth} onChange={handleChange} disabled={loading} />
                            {errors.date_of_birth && <span className={s.ErrorText}>{errors.date_of_birth}</span>}
                        </div>
                        <div className={s.Input}>
                            <p>Jinsi *</p>
                            <select name="gender" value={formData.gender} onChange={handleChange} disabled={loading}>
                                <option value="">Tanlang</option>
                                <option value="erkak">Erkak</option>
                                <option value="ayol">Ayol</option>
                            </select>
                            {errors.gender && <span className={s.ErrorText}>{errors.gender}</span>}
                        </div>
                        <div className={s.Input}>
                            <p>Telefon *</p>
                            <IMaskInput
                                mask="+998 00 000 00 00"
                                name="contact_number"
                                placeholder="+998 XX XXX XX XX"
                                value={formData.contact_number}
                                unmask={false}
                                lazy={false}
                                overwrite
                                onAccept={(value) => {
                                    handleChange({ target: { name: 'contact_number', value } });
                                }}
                                disabled={loading}
                            />
                            {errors.contact_number && <span className={s.ErrorText}>{errors.contact_number}</span>}
                        </div>
                    </div>

                    <div className={s.Input}>
                        <p>Manzil *</p>
                        <input type="text" name="address" placeholder="Yashash manzili"
                            value={formData.address} onChange={handleChange} disabled={loading} />
                        {errors.address && <span className={s.ErrorText}>{errors.address}</span>}
                    </div>

                    {serverError && <p className={s.ServerError}><i className="bi bi-exclamation-circle-fill"></i> {serverError}</p>}

                    <button type="submit" className={s.SubmitBtn} disabled={loading}>
                        {loading ? <Loading /> : (<>Davom etish <i className="bi bi-arrow-right"></i></>)}
                    </button>
                </form>
            )}

            {/* STEP 2 */}
            {step === 2 && credentials && (
                <div className={s.CredentialsStep}>
                    <div className={s.SuccessIcon}><i className="bi bi-check-circle-fill"></i></div>
                    <h2>Bemor muvaffaqiyatli qo'shildi!</h2>
                    <p className={s.CredentialsSub}>
                        Quyidagi login va parolni bemorga bering — u tizimga shu orqali kirishi mumkin
                    </p>
                    <div className={s.CredBox}>
                        <div className={s.CredRow}>
                            <div><span>Login</span><p>{credentials.username}</p></div>
                            <button type="button" onClick={() => handleCopy(credentials.username, 'username')}>
                                <i className={`bi ${copied === 'username' ? 'bi-check-lg' : 'bi-copy'}`}></i>
                            </button>
                        </div>
                        <div className={s.CredRow}>
                            <div><span>Parol</span><p>{credentials.password}</p></div>
                            <button type="button" onClick={() => handleCopy(credentials.password, 'password')}>
                                <i className={`bi ${copied === 'password' ? 'bi-check-lg' : 'bi-copy'}`}></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" className={s.SubmitBtn} onClick={() => setStep(3)}>
                        Davom etish <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            )}

            {/* STEP 3 — endi umumiy VisitForm */}
            {step === 3 && !finished && (
                <VisitForm
                    value={visitData}
                    onChange={setVisitData}
                    errors={visitErrors}
                    onSubmit={handleSubmitStep3}
                    loading={visitLoading}
                    serverError={visitServerError}
                    submitLabel="Saqlash"
                />
            )}

            {finished && (
                <div className={s.CredentialsStep}>
                    <div className={s.SuccessIcon}><i className="bi bi-check-circle-fill"></i></div>
                    <h2>Tayyor!</h2>
                    <p className={s.CredentialsSub}>Bemor qabul qilindi va tashrif ma'lumotlari saqlandi</p>
                </div>
            )}

        </section>
    )
}

export default PatientAdmission