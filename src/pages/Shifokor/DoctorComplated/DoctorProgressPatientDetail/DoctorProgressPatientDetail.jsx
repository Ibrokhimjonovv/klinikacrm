import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './DoctorProgressPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../../context/context';
import Modal from '../../../../components/Modal/Modal';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

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

const doctorFullName = (doc) => {
    if (!doc) return ''
    return [doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(' ')
}

const DoctorProgressPatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { fetchDoctorCounts } = useAppContext()

    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [treatmentHistory, setTreatmentHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyError, setHistoryError] = useState(null)
    const [togglingItemId, setTogglingItemId] = useState(null)

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

    const fetchTreatmentHistory = async (silent = false) => {
        try {
            if (!silent) setHistoryLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patient/${id}/treatments/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setTreatmentHistory(
                (data.treatments || []).filter(plan => !plan.is_end)
            )
        } catch (err) {
            console.error('Tarixni olishda xatolik:', err)
            if (!silent) setHistoryError(err.message)
        } finally {
            if (!silent) setHistoryLoading(false)
        }
    }

    useEffect(() => {
        fetchPatient()
        fetchTreatmentHistory()
    }, [id])

    const handleToggleItem = async (planId, dayId, item) => {
        const newChecked = !item.checked
        setTogglingItemId(item.id)

        setTreatmentHistory(prev => prev.map(plan =>
            plan.id !== planId ? plan : {
                ...plan,
                days: plan.days.map(d =>
                    d.id !== dayId ? d : {
                        ...d,
                        items: d.items.map(it => it.id === item.id ? { ...it, checked: newChecked } : it)
                    }
                )
            }
        ))

        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/treatmentItem/${item.id}/check/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ checked: newChecked }),
            })
            if (!res.ok) throw new Error('check failed')

            const data = await res.json()
            if (data?.data) {
                setTreatmentHistory(prev => prev.map(plan =>
                    plan.id !== planId ? plan : {
                        ...plan,
                        days: plan.days.map(d =>
                            d.id !== dayId ? d : {
                                ...d,
                                items: d.items.map(it => it.id === item.id ? { ...it, ...data.data } : it)
                            }
                        )
                    }
                ))
            }

            fetchTreatmentHistory(true)

        } catch (err) {
            console.error('Belgilashda xatolik:', err)
            setTreatmentHistory(prev => prev.map(plan =>
                plan.id !== planId ? plan : {
                    ...plan,
                    days: plan.days.map(d =>
                        d.id !== dayId ? d : {
                            ...d,
                            items: d.items.map(it => it.id === item.id ? { ...it, checked: !newChecked } : it)
                        }
                    )
                }
            ))
        } finally {
            setTogglingItemId(null)
        }
    }

    const [endingPlanId, setEndingPlanId] = useState(null)
    const [confirmEndPlan, setConfirmEndPlan] = useState(null)

    const openEndPlanConfirm = (plan) => {
        setConfirmEndPlan({
            id: plan.id,
            diagnosis: plan.diagnosis,
            progress: Math.round(plan.progress ?? 0),
        })
    }

    const confirmEndPlanAction = async () => {
        if (!confirmEndPlan) return
        const planId = confirmEndPlan.id

        setEndingPlanId(planId)
        setConfirmEndPlan(null)

        try {
            const token = localStorage.getItem('hospital_access')

            const res = await fetch(`${api}/donePatient/${planId}/`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    is_end: true,
                }),
            })

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            setTreatmentHistory(prev =>
                prev.filter(plan => plan.id !== planId)
            )

            // MUHIM: sidebar'dagi bemorlar sonlarini darhol yangilaydi
            fetchDoctorCounts()

        } catch (err) {
            console.error('Rejani yakunlashda xatolik:', err)
        } finally {
            setEndingPlanId(null)
        }
    }

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return null

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate('/doctor-progress-patients')}>
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
                    Jarayondagi bemor
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

            {patient.complaints?.length > 0 && (
                <div className={s.ComplaintsRow}>
                    {patient.complaints.map((c) => (
                        <div key={c.id} className={s.ComplaintChip}>
                            <span className={`${s.StatusDot} ${s[c.status?.toLowerCase()]}`}></span>
                            <span>{c.complaint}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className={s.PlansSection}>
                <h2>Tashxis va davolash jarayoni</h2>

                {historyLoading && <p className={s.Empty}>Yuklanmoqda...</p>}
                {historyError && (
                    <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {historyError}</p>
                )}

                {!historyLoading && treatmentHistory.length === 0 && (
                    <p className={s.Empty}>Bu bemor uchun hozircha tashxis qo'yilmagan</p>
                )}

                <div className={s.PlansList}>
                    {treatmentHistory.map((plan) => {
                        const statusInfo = getPlanStatus(plan)
                        const progress = Math.round(plan.progress ?? 0)
                        const doctor = plan.doctors?.[0]

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

                                        {plan.complaint && (
                                            <p className={s.ComplaintLabel}>
                                                <i className="bi bi-chat-square-text"></i> {plan.complaint}
                                            </p>
                                        )}

                                        <div className={s.PlanMeta}>
                                            {plan.created_at && (
                                                <span>
                                                    <i className="bi bi-calendar-plus"></i>
                                                    Boshlangan: <DateTimeFormatter date={plan.created_at} format="date" />
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
                                            <span className={s.DayBadge}>{day.day_number || dayIndex + 1}-kun</span>

                                            <ul className={s.CheckList}>
                                                {day.items?.map((item) => (
                                                    <li key={item.id}>
                                                        <label
                                                            className={s.CheckboxRow}
                                                            title={
                                                                item.checked && item.checked_by
                                                                    ? `${doctorFullName(item.checked_by.doctor) || item.checked_by.username} tomonidan belgilangan`
                                                                    : undefined
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={!!item.checked}
                                                                disabled={togglingItemId === item.id}
                                                                onChange={() => handleToggleItem(plan.id, day.id, item)}
                                                            />
                                                            <span className={item.checked ? s.CheckedText : ''}>
                                                                {item.text}
                                                            </span>
                                                        </label>
                                                    </li>
                                                ))}
                                            </ul>

                                            {day.note && <p className={s.PlanDayNote}>{day.note}</p>}
                                        </div>
                                    ))}
                                </div>

                                <div className={s.PlanActions}>
                                    {!plan.is_end ? (
                                        <button
                                            type="button"
                                            className={s.EndPlanBtn}
                                            onClick={() => openEndPlanConfirm(plan)}
                                            disabled={endingPlanId === plan.id}
                                        >
                                            {endingPlanId === plan.id ? (
                                                <>
                                                    <i className="bi bi-arrow-repeat"></i>
                                                    Yakunlanmoqda...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-circle"></i>
                                                    Rejani yakunlash
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className={s.EndedPlan}>
                                            <i className="bi bi-check-circle-fill"></i>
                                            Reja yakunlangan
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Modal isOpen={!!confirmEndPlan} onClose={() => setConfirmEndPlan(null)}>
                {confirmEndPlan && (
                    <div className={s.EndConfirmBox}>
                        <div className={`${s.EndConfirmIcon} ${confirmEndPlan.progress < 100 ? s.Warning : s.Success}`}>
                            <i className={`bi ${confirmEndPlan.progress < 100 ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`}></i>
                        </div>

                        {confirmEndPlan.progress < 100 ? (
                            <>
                                <h2>Muolaja to'liq tugatilmagan</h2>
                                <p>
                                    <strong>{confirmEndPlan.diagnosis}</strong> tashxisi bo'yicha davolash rejasi
                                    hozircha faqat <strong>{confirmEndPlan.progress}%</strong> bajarilgan.
                                </p>
                                <p className={s.EndConfirmSub}>
                                    Baribir yakunlashni istaysizmi? Bu amalni qaytarib bo'lmaydi.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2>Davolash rejasini yakunlash</h2>
                                <p>
                                    <strong>{confirmEndPlan.diagnosis}</strong> tashxisi bo'yicha davolash rejasi
                                    to'liq (<strong>100%</strong>) bajarilgan.
                                </p>
                                <p className={s.EndConfirmSub}>
                                    Rejani yakunlaganingizni tasdiqlaysizmi?
                                </p>
                            </>
                        )}

                        <div className={s.EndConfirmButtons}>
                            <button
                                type="button"
                                className={s.CancelBtn}
                                onClick={() => setConfirmEndPlan(null)}
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                className={confirmEndPlan.progress < 100 ? s.ConfirmWarningBtn : s.ConfirmSuccessBtn}
                                onClick={confirmEndPlanAction}
                            >
                                <i className="bi bi-check-lg"></i>
                                {confirmEndPlan.progress < 100 ? 'Baribir yakunlash' : 'Yakunlash'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    )
}

export default DoctorProgressPatientDetail