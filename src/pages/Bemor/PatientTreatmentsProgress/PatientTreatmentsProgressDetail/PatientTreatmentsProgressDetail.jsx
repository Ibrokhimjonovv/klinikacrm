import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './PatientTreatmentsProgressDetail.module.scss';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { api } from '../../../../App';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
})

const formatSum = (n) => Math.round(n).toLocaleString('uz-UZ') + " so'm"

const getPlanStatus = (plan) => {
    const progress = plan.progress ?? 0
    if (plan.is_end || plan.completed_at || progress >= 100) {
        return { label: 'Yakunlandi', className: 'done' }
    }
    if (plan.started_at || progress > 0) {
        return { label: 'Jarayonda', className: 'active' }
    }
    return { label: 'Boshlanmagan', className: 'watch' }
}

// Bitta rejaning barcha kunlaridagi dori-darmonlar summasini hisoblaydi
const getPlanMedicineTotal = (plan) => {
    return (plan.days || []).reduce((sum, day) => {
        const dayTotal = (day.medicines || []).reduce((s2, m) => s2 + (m.total_price || 0), 0)
        return sum + dayTotal
    }, 0)
}

const PatientTreatmentProgressDetail = () => {
    const navigate = useNavigate()

    const [patient, setPatient] = useState(null)
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [mediaGallery, setMediaGallery] = useState(null)

    const fetchProgress = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patient/me/treatments/prog/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()

            const list = Array.isArray(data) ? data : data.results || []
            const me = list[0] || null

            setPatient(me)
            setPlans(me?.treatment_plan || [])
        } catch (err) {
            console.error('Davolanish jarayonini olishda xatolik:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProgress()
    }, [])

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return <div className={s.State}><p>Ma'lumot topilmadi</p></div>

    const activePlans = plans.filter(p => !p.is_end)
    const completedPlans = plans.filter(p => p.is_end)

    const renderItemDisplay = (item) => {
        if (item.dif) {
            const hasFile = !!item.medical_media || !!item.file

            return (
                <div className={`${s.MediaCard} ${hasFile ? s.MediaCardDone : ''}`}>
                    <div className={s.MediaCardTop}>
                        <div className={s.MediaCardIcon}>
                            <i className={`bi ${hasFile ? 'bi-check-circle-fill' : 'bi-image'}`}></i>
                        </div>
                        <div className={s.MediaCardText}>
                            <p className={s.MediaCardLabel}>
                                {hasFile ? 'Fayl yuklangan' : 'Media kutilmoqda'}
                            </p>
                            <p className={s.MediaCardDesc}>{item.text}</p>
                        </div>
                    </div>

                    {hasFile && (
                        <a
                            href={item.medical_media || item.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.MediaViewBtn}
                        >
                            <i className="bi bi-eye"></i> Ko'rish
                        </a>
                    )}

                    <div className={`${s.StatusRow} ${item.checked ? s.StatusRowDone : ''}`}>
                        <i className={`bi ${item.checked ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                        <span>{item.checked ? 'Bajarildi' : 'Bajarilishi kutilmoqda'}</span>
                    </div>
                </div>
            )
        }

        return (
            <div className={`${s.MediaCard} ${item.checked ? s.MediaCardDone : ''}`}>
                <div className={s.MediaCardTop}>
                    <div className={s.MediaCardIcon}>
                        <i className={`bi ${item.checked ? 'bi-check-circle-fill' : 'bi-list-check'}`}></i>
                    </div>
                    <div className={s.MediaCardText}>
                        <p className={s.MediaCardLabel}>
                            {item.checked ? 'Bajarildi' : 'Bajarilishi kutilmoqda'}
                        </p>
                        <p className={s.MediaCardDesc}>{item.text}</p>
                    </div>
                </div>
            </div>
        )
    }

    const renderPlan = (plan) => {
        const statusInfo = getPlanStatus(plan)
        const progress = Math.round(plan.progress ?? 0)
        const medicineTotal = getPlanMedicineTotal(plan)

        return (
            <div key={plan.id} className={s.PlanCard}>

                <div className={s.PlanCardHead}>
                    <div className={s.PlanCardHeadLeft}>
                        <div className={s.PlanTitleRow}>
                            <h3>{plan.diagnosis}</h3>
                            <span className={`${s.PlanStatusBadge} ${s[statusInfo.className]}`}>
                                {statusInfo.label}
                            </span>
                        </div>

                        {plan.media?.length > 0 && (
                            <button
                                type="button"
                                className={s.DiagnosisMediaBtn}
                                onClick={() => setMediaGallery({ diagnosis: plan.diagnosis, items: plan.media })}
                            >
                                <i className="bi bi-paperclip"></i>
                                {plan.media.length} ta fayl
                            </button>
                        )}

                        <div className={s.PlanMeta}>
                            {plan.created_at && (
                                <span>
                                    <i className="bi bi-calendar-plus"></i>
                                    Boshlangan: <DateTimeFormatter date={plan.created_at} format="date" />
                                </span>
                            )}
                            {plan.finish_date && (
                                <span>
                                    <i className="bi bi-calendar-check"></i>
                                    Tugash sanasi: {plan.finish_date}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={s.PlanStats}>
                        <div className={s.ProgressBarTrack}>
                            <div className={s.ProgressBarFill} style={{ width: `${progress}%` }} />
                        </div>
                        <span className={s.ProgressPercent}>{progress}%</span>
                    </div>
                </div>

                <div className={s.PlanDaysGrid}>
                    {plan.days?.map((day, dayIndex) => {
                        const dayMedTotal = (day.medicines || []).reduce((s2, m) => s2 + (m.total_price || 0), 0)

                        return (
                            <div key={day.id} className={s.PlanDayCard}>
                                <span className={s.DayBadge}>{day.day_number || dayIndex + 1}-kun</span>

                                <ul className={s.CheckList}>
                                    {day.items?.map((item) => (
                                        <li key={item.id}>
                                            {renderItemDisplay(item)}
                                        </li>
                                    ))}
                                </ul>

                                {day.medicines?.length > 0 && (
                                    <div className={s.MedicinesBlock}>
                                        <p className={s.MedicinesTitle}>
                                            <i className="bi bi-capsule"></i> Dori-darmonlar
                                        </p>
                                        <ul className={s.MedicinesList}>
                                            {day.medicines.map((m) => (
                                                <li key={m.id}>
                                                    <span className={s.MedName}>{m.medicine?.name}</span>
                                                    <span className={s.MedQty}>{m.quantity} dona × {formatSum(m.unit_price)}</span>
                                                    <span className={s.MedTotal}>{formatSum(m.total_price)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className={s.MedicinesDayTotal}>
                                            <span>Kunlik dori narxi</span>
                                            <span>{formatSum(dayMedTotal)}</span>
                                        </div>
                                    </div>
                                )}

                                {day.note && <p className={s.PlanDayNote}>{day.note}</p>}
                            </div>
                        )
                    })}
                </div>

                {medicineTotal > 0 && (
                    <div className={s.PlanTotalBox}>
                        <span>Reja bo'yicha jami dori-darmon narxi</span>
                        <span>{formatSum(medicineTotal)}</span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate('/')}>
                <i className="bi bi-arrow-left"></i> Bosh sahifaga qaytish
            </button>

            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>{patient.first_name?.[0] || '?'}</div>
                    <div>
                        <h1>{patient.first_name} {patient.last_name} {patient.middle_name}</h1>
                        <p>{calcAge(patient.date_of_birth)} yosh · {patient.gender === 'erkak' ? 'Erkak' : 'Ayol'}</p>
                    </div>
                </div>
                <span className={s.StatusPill}>
                    Mening davolanishim
                </span>
            </div>

            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div><span>Telefon</span><p>{patient.contact_number}</p></div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-geo-alt"></i>
                    <div><span>Manzil</span><p>{patient.address}</p></div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Tug'ilgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient.date_of_birth} format='date' />
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-clock-history"></i>
                    <div>
                        <span>Ro'yxatdan o'tgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient.create_date} />
                    </div>
                </div>
            </div>

            {plans.length === 0 && (
                <p className={s.Empty}>Hozircha sizga davolash rejasi biriktirilmagan</p>
            )}

            {activePlans.length > 0 && (
                <div className={s.PlansSection}>
                    <h2>Faol davolash rejalari</h2>
                    <div className={s.PlansList}>
                        {activePlans.map(renderPlan)}
                    </div>
                </div>
            )}

            {completedPlans.length > 0 && (
                <div className={s.PlansSection}>
                    <h2>Yakunlangan davolash rejalari</h2>
                    <div className={s.PlansList}>
                        {completedPlans.map(renderPlan)}
                    </div>
                </div>
            )}

            {mediaGallery && (
                <div className={s.GalleryOverlay} onClick={() => setMediaGallery(null)}>
                    <div className={s.GalleryBox} onClick={(e) => e.stopPropagation()}>
                        <div className={s.GalleryHead}>
                            <div>
                                <h2>Tashxis fayllari</h2>
                                <p>{mediaGallery.diagnosis}</p>
                            </div>
                            <button type="button" className={s.GalleryCloseBtn} onClick={() => setMediaGallery(null)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className={s.GalleryGrid}>
                            {mediaGallery.items.map((m) => {
                                const url = m.url || m.file || m.media
                                const isPdfFile = url?.toLowerCase().includes('.pdf')

                                return (
                                    <a
                                        key={m.id}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={s.GalleryItem}
                                    >
                                        <div className={s.GalleryThumb}>
                                            {isPdfFile ? (
                                                <i className="bi bi-file-earmark-pdf"></i>
                                            ) : (
                                                <img src={url} alt={m.text || 'Fayl'} />
                                            )}
                                        </div>
                                        <p className={s.GalleryCaption}>{m.text || m.media_text || 'Fayl'}</p>
                                    </a>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default PatientTreatmentProgressDetail