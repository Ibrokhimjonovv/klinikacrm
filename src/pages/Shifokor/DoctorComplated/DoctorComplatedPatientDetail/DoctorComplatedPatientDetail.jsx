import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './DoctorComplatedPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const formatSum = (n) => Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm"

// ✅ plan.doctors[i] va plan.created_by.doctor kabi NASTED
// obyektlar (first_name/middle_name/last_name) uchun ishlatiladi.
const doctorFullName = (doc) => {
    if (!doc) return ''
    return [doc.first_name, doc.last_name, doc.middle_name].filter(Boolean).join(' ')
}

const DoctorComplatedPatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [treatmentHistory, setTreatmentHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyError, setHistoryError] = useState(null)

    const fetchPatient = async () => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patientInfo/${id}/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setPatient(data)
        } catch (err) {
            console.error('API xatosi:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchTreatmentHistory = async () => {
        try {
            setHistoryLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patient/${id}/treatments/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            // Faqat yakunlangan (is_end: true) rejalar
            setTreatmentHistory(
                (data.treatments || []).filter(plan => plan.is_end)
            )
        } catch (err) {
            console.error('Tarixni olishda xatolik:', err)
            setHistoryError(err.message)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        fetchPatient()
        fetchTreatmentHistory()
    }, [id])

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return null

    // ------------------------------------------------------------
    // ✅ Bandning "xizmat / vaqt / narx / davomiylik" belgilari.
    // API har bir item bilan birga service_detail va time
    // qaytaradi — avval bular umuman ko'rsatilmasdi.
    // ------------------------------------------------------------
    const renderItemMeta = (item) => {
        const hasMeta = item.service_detail?.name || item.time || item.service_detail?.price != null
        if (!hasMeta) return null

        return (
            <div className={s.ItemMetaRow}>
                {item.service_detail?.name && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-clipboard2-pulse"></i>
                        {item.service_detail.name}
                    </span>
                )}
                {item.time && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-clock"></i>
                        {item.time}
                    </span>
                )}
                {item.service_detail?.price != null && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-cash"></i>
                        {formatSum(item.service_detail.price)}
                    </span>
                )}
                {item.service_detail?.duration_minutes != null && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-hourglass-split"></i>
                        {item.service_detail.duration_minutes} daq.
                    </span>
                )}
            </div>
        )
    }

    // ------------------------------------------------------------
    // ✅ Kunlik dorilar ro'yxati (TreatmentPlanDay.medicines,
    // item'lardan alohida keladigan massiv).
    // ------------------------------------------------------------
    const renderDayMedicines = (day) => {
        if (!day.medicines || day.medicines.length === 0) return null

        return (
            <div className={s.DayMedicinesBox}>
                <p className={s.DayMedicinesTitle}>
                    <i className="bi bi-capsule"></i> Dorilar
                </p>
                <ul className={s.DayMedicinesList}>
                    {day.medicines.map((med) => (
                        <li key={med.id}>
                            <span className={s.DayMedicineName}>
                                {med.medicine_name || 'Nomaʼlum dori'}
                            </span>
                            <span className={s.DayMedicineCalc}>
                                {med.quantity} dona × {formatSum(med.unit_price)} = {formatSum(med.total_price)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate('/doctor-complated-patients')}>
                <i className="bi bi-arrow-left"></i> Bemorlar ro'yxatiga qaytish
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
                    <i className="bi bi-check-circle-fill"></i> Yakunlangan bemor
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

            {/* {patient.complaints?.length > 0 && (
                <div className={s.ComplaintsRow}>
                    {patient.complaints.map((c) => (
                        <div key={c.id} className={s.ComplaintChip}>
                            <span className={`${s.StatusDot} ${s[c.status?.toLowerCase()]}`}></span>
                            <span>{c.complaint}</span>
                        </div>
                    ))}
                </div>
            )} */}

            <div className={s.PlansSection}>
                <h2>Yakunlangan davolash rejalari</h2>

                {historyLoading && <p className={s.Empty}>Yuklanmoqda...</p>}
                {historyError && (
                    <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {historyError}</p>
                )}

                {!historyLoading && treatmentHistory.length === 0 && (
                    <p className={s.Empty}>Bu bemor uchun yakunlangan davolash rejasi mavjud emas</p>
                )}

                <div className={s.PlansList}>
                    {treatmentHistory.map((plan) => {
                        const progress = Math.round(plan.progress ?? 0)
                        const doctor = plan.doctors?.[0]

                        // ✅ Umumiy narx — plan'ning o'zida "total_price"
                        // maydoni yo'q, shu sabab har bir kunning
                        // "price" qiymatlarini qo'shib chiqaramiz.
                        const totalPrice = (plan.days || []).reduce(
                            (sum, day) => sum + (Number(day.price) || 0),
                            0
                        )

                        return (
                            <div key={plan.id} className={s.PlanCard}>

                                <div className={s.PlanCardHead}>
                                    <div className={s.PlanCardHeadLeft}>
                                        <div className={s.PlanTitleRow}>
                                            <h3>Shikoyat: {plan.patient?.complaint}</h3>
                                        </div>
                                        <br />
                                        <div className={s.PlanTitleRow}>
                                            <h3>Tashxis: {plan.diagnosis}</h3>
                                            <span className={`${s.PlanStatusBadge} ${s.done}`}>
                                                <i className="bi bi-check-circle-fill"></i> Yakunlangan
                                            </span>
                                        </div>

                                        {plan.complaint && (
                                            <p className={s.ComplaintLabel}>
                                                <i className="bi bi-chat-square-text"></i> {plan.complaint}
                                            </p>
                                        )}

                                        <div className={s.PlanMeta}>
                                            {doctor && (
                                                <span>
                                                    <i className="bi bi-person-badge"></i>
                                                    {doctorFullName(doctor)}
                                                </span>
                                            )}
                                            {plan.created_at && (
                                                <span>
                                                    <i className="bi bi-calendar-plus"></i>
                                                    Boshlangan: <DateTimeFormatter date={plan.created_at} format="date" />
                                                </span>
                                            )}
                                            {plan.completed_at && (
                                                <span>
                                                    <i className="bi bi-calendar-check"></i>
                                                    Yakunlangan: <DateTimeFormatter date={plan.completed_at} format="date" />
                                                </span>
                                            )}
                                            {totalPrice > 0 && (
                                                <span>
                                                    <i className="bi bi-receipt"></i>
                                                    Umumiy narx: <strong>{formatSum(totalPrice)}</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={s.PlanStats}>
                                        <div className={s.ProgressBarTrack}>
                                            <div
                                                className={s.ProgressBarFill}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className={s.ProgressPercent}>{progress}%</span>
                                    </div>
                                </div>

                                <div className={s.PlanDaysGrid}>
                                    {plan.days?.map((day, dayIndex) => (
                                        <div key={day.id} className={s.PlanDayCard}>
                                            <div className={s.PlanDayCardHead}>
                                                <span className={s.DayBadge}>{day.day_number || dayIndex + 1}-kun</span>
                                                {day.price != null && (
                                                    <span className={s.DayPriceTag}>{formatSum(day.price)}</span>
                                                )}
                                            </div>

                                            <ul className={s.ItemsPlainList}>
                                                {day.items?.map((item) => (
                                                    <li key={item.id}>
                                                        <i className={`bi ${item.checked ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                                                        <div className={s.ItemBody}>
                                                            <span className={item.checked ? s.CheckedText : ''}>
                                                                {item.text}
                                                            </span>
                                                            {renderItemMeta(item)}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>

                                            {renderDayMedicines(day)}

                                            {day.note && <p className={s.PlanDayNote}>{day.note}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

        </div>
    )
}

export default DoctorComplatedPatientDetail