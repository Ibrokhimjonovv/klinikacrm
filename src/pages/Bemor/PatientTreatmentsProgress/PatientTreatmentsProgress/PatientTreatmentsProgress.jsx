import React, { useEffect, useState } from 'react';
import s from "./PatientTreatmentsProgress.module.scss"
import { useNavigate } from 'react-router-dom'
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const doctorFullName = (doc) => {
    if (!doc) return ''
    return [doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(' ')
}

const getStatusInfo = (status) => {
    if (status === 'DONE' || status === 'COMPLETED') return { label: 'Yakunlandi', key: 'done' }
    if (status === 'IN_PROGRESS') return { label: 'Jarayonda', key: 'active' }
    return { label: 'Boshlanmagan', key: 'watch' }
}

const PatientTreatmentsProgress = () => {
    const navigate = useNavigate()

    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem('hospital_access')
                const res = await fetch(`${api}/patient/me/treatments/prog/list/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                }

                const data = await res.json()
                setPlans(Array.isArray(data) ? data : data.results || [])
            } catch (err) {
                console.error('API xatosi:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchPlans()
    }, [])

    if (loading) {
        return (
            <div className={s.PatientsPage}>
                <p>Ma'lumotlar yuklanmoqda...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className={s.PatientsPage}>
                <p>Ma'lumotlarni yuklashda xatolik: {error}</p>
            </div>
        )
    }

    return (
        <div className={s.PatientsPage}>

            <div className={s.TopRow}>
                <div>
                    <h1>Jarayondagi davolanish rejalari</h1>
                    <p>Sizning davolanish rejalaringiz</p>
                </div>
            </div>

            {plans.length === 0 && (
                <p className={s.Empty}>Hozircha davolash rejalari mavjud emas</p>
            )}

            {plans.length > 0 && (
                <div className={s.PlansList}>
                    {plans.map((plan) => {
                        const statusInfo = getStatusInfo(plan.status)
                        const doctor = plan.doctors?.[0]

                        return (
                            <div
                                key={plan.id}
                                className={s.PlanCard}
                                onClick={() => navigate(`/me/treatments-progress-list/${plan.id}`)}
                            >
                                <div className={s.PlanCardLeft}>
                                    <div className={s.PlanIcon}>
                                        <i className="bi bi-clipboard2-pulse"></i>
                                    </div>
                                    <div>
                                        <h3>{plan.diagnosis}</h3>
                                        {plan.complaint?.text && (
                                            <p className={s.ComplaintLine}>
                                                <i className="bi bi-chat-square-text"></i> {plan.complaint.text}
                                            </p>
                                        )}
                                        <div className={s.PlanMeta}>
                                            {doctor && (
                                                <span>
                                                    <i className="bi bi-person-badge"></i>
                                                    {doctorFullName(doctor)}
                                                    {doctor.specialty && ` · ${doctor.specialty}`}
                                                </span>
                                            )}
                                            {plan.created_at && (
                                                <span>
                                                    <i className="bi bi-calendar-plus"></i>
                                                    <DateTimeFormatter date={plan.created_at} format="date" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={s.PlanCardRight}>
                                    <span className={`${s.StatusBadge} ${s[statusInfo.key]}`}>
                                        {statusInfo.label}
                                    </span>
                                    <i className="bi bi-chevron-right"></i>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    )
}

export default PatientTreatmentsProgress