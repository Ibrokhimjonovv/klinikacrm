import React, { useEffect, useState } from 'react';
import s from "./DoctorHome.module.scss"
import { useAppContext } from '../../../context/context'
import { api } from '../../../App';

const getPatientStatus = (progress) => {
  const p = progress ?? 0
  if (p >= 100) return { label: 'Tugallandi', key: 'done' }
  if (p > 0) return { label: 'Jarayonda', key: 'progress' }
  return { label: 'Kutilmoqda', key: 'pending' }
}

const DoctorHome = () => {
  const { user, doctorCounts, fetchDoctorCounts } = useAppContext()

  const [patients, setPatients] = useState([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState(null)

  const fetchDoctorPatients = async () => {
    try {
      setPatientsLoading(true)
      const token = localStorage.getItem('hospital_access')
      const res = await fetch(`${api}/doctorPatient/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setPatients(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      console.error('Bemorlarni olishda xatolik:', err)
      setPatientsError(err.message)
    } finally {
      setPatientsLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctorPatients()
    fetchDoctorCounts()
  }, [])

  const getPatientStatus = (patient) => {
    const progress = patient.progress?.total_progress ?? 0
    const plans = patient.treatment_plan || []
    const complaints = patient.complaints || []

    // Eng ustuvor: agar hali ko'rib chiqilmagan (tashxis qo'yilmagan) shikoyat bo'lsa
    const hasWaitingComplaint = complaints.some(c => c.status === 'WAITING')
    if (hasWaitingComplaint) {
      return { label: 'Kutilmoqda', key: 'pending' }
    }

    const allPlansEnded = plans.length > 0 && plans.every(p => p.is_end === true)

    if (progress >= 100 || allPlansEnded) {
      return { label: 'Yakunlandi', key: 'done' }
    }

    if (progress > 0) {
      return { label: 'Jarayonda', key: 'progress' }
    }

    return { label: 'Kutilmoqda', key: 'pending' }
  }

  const stats = [
    {
      title: 'Jami bemorlar',
      value: doctorCounts.all,
      change: "So'nggi oydan +12",
      icon: 'bi-people-fill',
      dark: true
    },
    {
      title: 'Kutilayotgan',
      value: doctorCounts.waiting,
      change: 'Muhokamada',
      icon: 'bi-hourglass-split'
    },
    {
      title: 'Jarayondagi bemorlar',
      value: doctorCounts.process,
      change: "So'nggi oydan +3",
      icon: 'bi-heart-pulse'
    },
    {
      title: 'Yakunlangan',
      value: doctorCounts.completed,
      change: "So'nggi oydan +5",
      icon: 'bi-check-circle'
    },
  ]

  // Davolash jarayoni foizi — barcha bemorlar orasida nechtasi yakunlangan
  const progressPercent = doctorCounts.all > 0
    ? Math.round((doctorCounts.completed / doctorCounts.all) * 100)
    : 0

  // So'nggi 4 ta bemor (ro'yxatda ko'rsatish uchun)
  const recentPatients = patients.slice(0, 4).map(p => {
    const statusInfo = getPatientStatus(p)

    return {
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || "Noma'lum",
      task: p.complaints?.[0].complaint || "Ko'rsatilmagan",
      avatar: p.first_name ? p.first_name[0].toUpperCase() : '?',
      statusLabel: statusInfo.label,
      statusKey: statusInfo.key,
    }
  })

  return (
    <section className={s.Dashboard}>

      <div className={s.TopRow}>
        <div>
          <h1>Bosh sahifa</h1>
          <p>Xush kelibsiz, {user?.doctor?.first_name || 'Doktor'}</p>
        </div>
        <div className={s.TopBtns}>
          {/* <button className={s.PrimaryBtn}><i className="bi bi-plus-lg"></i> Yangi qabul</button> */}
          <button
            className={s.SecondaryBtn}
            onClick={() => window.location.reload()}
          >
            Ma'lumotlarni qayta yuklash
          </button>
        </div>
      </div>

      <div className={s.StatsRow}>
        {stats.map((stat, i) => (
          <div key={i} className={`${s.StatCard} ${stat.dark ? s.StatCardDark : ''}`}>
            <div className={s.StatTop}>
              <p>{stat.title}</p>
              <i className={`bi ${stat.icon}`}></i>
            </div>
            <h2>{stat.value}</h2>
            <span>{stat.change}</span>
          </div>
        ))}
      </div>

      <div className={s.BottomRow}>

        <div className={s.PatientsCard}>
          <div className={s.UpcomingHead}>
            <h3>Bemorlar ro'yxati</h3>
          </div>

          {patientsLoading ? (
            <p className={s.Empty}>Yuklanmoqda...</p>
          ) : patientsError ? (
            <p className={s.Empty}>Xatolik: {patientsError}</p>
          ) : recentPatients.length === 0 ? (
            <p className={s.Empty}>Hozircha bemorlar mavjud emas</p>
          ) : (
            <ul>
              {recentPatients.map((p) => (
                <li key={p.id}>
                  <div className={s.PatientLeft}>
                    <div className={s.Avatar}>{p.avatar}</div>
                    <div>
                      <p>{p.name}</p>
                      <span>{p.task}</span>
                    </div>
                  </div>
                  <span className={`${s.Status} ${s[p.statusKey]}`}>
                    {p.statusLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={s.ProgressCard}>
          <h3>Davolash jarayoni</h3>
          <div className={s.Donut} style={{ '--percent': progressPercent }}>
            <div className={s.DonutInner}>
              <h2>{progressPercent}%</h2>
              <span>Tugallangan</span>
            </div>
          </div>
          <div className={s.Legend}>
            <span><i className={s.pending}></i> Kutilmoqda</span>
            <span><i className={s.progress}></i> Jarayonda</span>
            <span><i className={s.done}></i> Tugallangan</span>
          </div>
        </div>
      </div>

    </section>
  )
}

export default DoctorHome