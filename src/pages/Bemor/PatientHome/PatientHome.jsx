import React, { useEffect, useState } from 'react';
import s from "./PatientHome.module.scss"
import { useAppContext } from '../../../context/context'
import { api } from '../../../App';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';
const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
})

const doctorFullName = (doc) => {
    if (!doc) return ''
    return [doc.first_name, doc.middle_name, doc.last_name].filter(Boolean).join(' ')
}

const getPlanStatusInfo = (plan) => {
    const progress = plan.progress ?? 0
    if (plan.is_end || progress >= 100) return { label: 'Yakunlandi', key: 'done' }
    if (progress > 0) return { label: 'Jarayonda', key: 'active' }
    return { label: 'Boshlanmagan', key: 'pending' }
}

const PatientHome = () => {
    const { user } = useAppContext()

    const [profile, setProfile] = useState(null)
    const [profileLoading, setProfileLoading] = useState(true)

    const [treatments, setTreatments] = useState([])
    const [treatmentsLoading, setTreatmentsLoading] = useState(true)
    const [treatmentsError, setTreatmentsError] = useState(null)

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/me/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setProfile(data)
        } catch (err) {
            console.error('Profil ma\'lumotini olishda xatolik:', err)
        } finally {
            setProfileLoading(false)
        }
    }

    const fetchMyTreatments = async () => {
        try {
            setTreatmentsLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patient/me/treatments/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setTreatments(data.treatments || [])
        } catch (err) {
            console.error('Davolash rejalarini olishda xatolik:', err)
            setTreatmentsError(err.message)
        } finally {
            setTreatmentsLoading(false)
        }
    }

    useEffect(() => {
        fetchProfile()
        fetchMyTreatments()
    }, [])

    const patient = profile?.patient || profile

    const activePlans = treatments.filter(p => !p.is_end)
    const completedPlans = treatments.filter(p => p.is_end)

    const overallProgress = activePlans.length > 0
        ? Math.round(activePlans.reduce((sum, p) => sum + (p.progress ?? 0), 0) / activePlans.length)
        : (completedPlans.length > 0 ? 100 : 0)

    if (profileLoading) {
        return (
            <div className={s.PatientPage}>
                <p className={s.Empty}>Yuklanmoqda...</p>
            </div>
        )
    }

    return (
        <div className={s.PatientPage}>

            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>{patient?.first_name?.[0] || '?'}</div>
                    <div>
                        <p className={s.Greeting}>Xush kelibsiz</p>
                        <h1>{patient?.first_name} {patient?.last_name}</h1>
                        <p className={s.SubInfo}>
                            {calcAge(patient?.date_of_birth)} yosh · {patient?.gender === 'erkak' ? 'Erkak' : 'Ayol'}
                        </p>
                    </div>
                </div>

                <div className={s.OverallProgress}>
                    <div className={s.OverallProgressRing} style={{ '--percent': overallProgress }}>
                        <span>{overallProgress}%</span>
                    </div>
                    <p>Umumiy davolanish jarayoni</p>
                </div>
            </div>

            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div><span>Telefon</span><p>{patient?.contact_number || '—'}</p></div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-geo-alt"></i>
                    <div><span>Manzil</span><p>{patient?.address || '—'}</p></div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Tug'ilgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient?.date_of_birth} format="date" />
                    </div>
                </div>
            </div>

            <div className={s.StatsRow}>
                <div className={s.StatCard}>
                    <i className="bi bi-clipboard2-pulse"></i>
                    <div>
                        <h2>{activePlans.length}</h2>
                        <p>Jarayondagi tashxis</p>
                    </div>
                </div>
                <div className={s.StatCard}>
                    <i className="bi bi-check-circle"></i>
                    <div>
                        <h2>{completedPlans.length}</h2>
                        <p>Yakunlangan tashxis</p>
                    </div>
                </div>
            </div>

            <div className={s.Section}>
                <h2>Faol davolash rejalari</h2>

                {treatmentsLoading && <p className={s.Empty}>Yuklanmoqda...</p>}
                {treatmentsError && (
                    <p className={s.ErrorText}><i className="bi bi-exclamation-circle-fill"></i> {treatmentsError}</p>
                )}
                {!treatmentsLoading && activePlans.length === 0 && (
                    <p className={s.Empty}>Hozircha faol davolash rejasi mavjud emas</p>
                )}

                <div className={s.PlansList}>
                    {activePlans.map((plan) => {
                        const statusInfo = getPlanStatusInfo(plan)
                        const progress = Math.round(plan.progress ?? 0)
                        const doctor = plan.doctors?.[0]

                        return (
                            <div key={plan.id} className={s.PlanCard}>
                                <div className={s.PlanCardHead}>
                                    <div>
                                        <div className={s.PlanTitleRow}>
                                            <h3>{plan.diagnosis}</h3>
                                            <span className={`${s.StatusBadge} ${s[statusInfo.key]}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        {doctor && (
                                            <p className={s.DoctorLine}>
                                                <i className="bi bi-person-badge"></i>
                                                {doctorFullName(doctor)}
                                                {doctor.specialty && <span> · {doctor.specialty}</span>}
                                            </p>
                                        )}
                                    </div>

                                    <div className={s.PlanStats}>
                                        <div className={s.ProgressBarTrack}>
                                            <div className={s.ProgressBarFill} style={{ width: `${progress}%` }} />
                                        </div>
                                        <span>{progress}%</span>
                                    </div>
                                </div>

                                <div className={s.DaysGrid}>
                                    {plan.days?.map((day, dayIndex) => (
                                        <div key={day.id} className={s.DayCard}>
                                            <span className={s.DayBadge}>{day.day_number || dayIndex + 1}-kun</span>
                                            <ul className={s.ItemsList}>
                                                {day.items?.map((item) => (
                                                    <li key={item.id} className={item.checked ? s.ItemDone : ''}>
                                                        <i className={`bi ${item.checked ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                                                        <span>{item.text}</span>
                                                        {item.is_media && item.checked && (item.file_url || item.file) && (
                                                            <a
                                                                href={item.file_url || item.file}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={s.FileLink}
                                                            >
                                                                <i className="bi bi-paperclip"></i>
                                                            </a>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                            {day.note && <p className={s.DayNote}>{day.note}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {completedPlans.length > 0 && (
                <div className={s.Section}>
                    <h2>Yakunlangan davolash rejalari</h2>
                    <div className={s.CompletedList}>
                        {completedPlans.map((plan) => (
                            <div key={plan.id} className={s.CompletedCard}>
                                <div className={s.CompletedIcon}>
                                    <i className="bi bi-check-circle-fill"></i>
                                </div>
                                <div>
                                    <h4>{plan.diagnosis}</h4>
                                    <p>
                                        {plan.completed_at && (
                                            <>Yakunlangan: <DateTimeFormatter date={plan.completed_at} format="date" /></>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    )
}

export default PatientHome