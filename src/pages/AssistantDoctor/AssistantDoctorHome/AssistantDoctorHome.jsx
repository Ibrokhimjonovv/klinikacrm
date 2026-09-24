import React, { useEffect, useState } from 'react';
import s from "./AssistantDoctorHome.module.scss"
import { useAppContext } from '../../../context/context'
import { api } from '../../../App';

// ==========================================================
// Backend javobi (DoctorTaskSerializer) shu yerda bitta joyda
// moslanadi. Maydon nomlari serializerdagi nomlardan farq
// qilsa, FAQAT shu funksiyani o'zgartirasiz.
//
// Taxmin qilingan struktura (ExaminationRequest modeliga asosan):
// {
//   id, status, priority, requested_at, started_at, completed_at,
//   service: { id, name },
//   medical_visit: {
//     id,
//     patient: { id, first_name, last_name }
//   },
//   requested_by: {...},
//   assigned_to: {...}
// }
// ==========================================================
const normalizeTask = (t) => {
  const raw = String(t.status || '').toUpperCase()

  let statusKey = 'pending'
  let statusLabel = 'Kutilmoqda'

  if (['ASSIGNED', 'REQUESTED'].includes(raw)) {
    statusKey = 'pending'
    statusLabel = 'Kutilmoqda'
  } else if (['IN_PROGRESS', 'PROGRESS'].includes(raw)) {
    statusKey = 'progress'
    statusLabel = 'Jarayonda'
  } else if (['COMPLETED', 'DONE', 'END', 'ENDED'].includes(raw)) {
    statusKey = 'done'
    statusLabel = 'Yakunlandi'
  } else if (['CANCELLED', 'NO_SHOW'].includes(raw)) {
    statusKey = 'cancelled'
    statusLabel = raw === 'NO_SHOW' ? 'Kelmadi' : 'Bekor qilindi'
  }

  const patient = t.medical_visit?.patient || t.patient || {}

  return {
    id: t.id,
    name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "Noma'lum",
    task: t.service?.name || t.service_name || "Ko'rsatilmagan",
    avatar: patient.first_name ? patient.first_name[0].toUpperCase() : '?',
    statusKey,
    statusLabel,
    priority: t.priority,
    requestedAt: t.requested_at,
  }
}

const AssistantDoctorHome = () => {
  const { user } = useAppContext()

  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [startingId, setStartingId] = useState(null)

  const getToken = () => localStorage.getItem('hospital_access')

  useEffect(() => {
    const controller = new AbortController()

    const fetchTasks = async () => {
      try {
        setTasksLoading(true)
        setTasksError(null)
        const res = await fetch(`${api}/doctor/my-tasks/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.results || []
        setTasks(list.map(normalizeTask))
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Vazifalarni olishda xatolik:', err)
          setTasksError(err.message)
        }
      } finally {
        setTasksLoading(false)
      }
    }

    fetchTasks()
    return () => controller.abort()
  }, [reloadKey])

  // ----------------------------------------------------------
  // Vazifani boshlash: PATCH /doctor/my-tasks/:id/start/
  // ----------------------------------------------------------
  // const handleStartTask = async (id) => {
  //   try {
  //     setStartingId(id)
  //     const res = await fetch(`${api}/doctor/my-tasks/${id}/start/`, {
  //       method: 'PATCH',
  //       headers: {
  //         'Authorization': `Bearer ${getToken()}`,
  //         'Content-Type': 'application/json',
  //       },
  //     })
  //     if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
  //     setReloadKey(k => k + 1)
  //   } catch (err) {
  //     console.error('Vazifani boshlashda xatolik:', err)
  //   } finally {
  //     setStartingId(null)
  //   }
  // }

  const count = (key) => tasks.filter(p => p.statusKey === key).length
  const total = tasks.length
  const waiting = count('pending')
  const inProgress = count('progress')
  const completed = count('done')

  const stats = [
    {
      title: 'Jami vazifalar',
      value: total,
      change: 'Sizga biriktirilgan',
      icon: 'bi-people-fill',
      dark: true
    },
    {
      title: 'Kutilayotgan',
      value: waiting,
      change: 'Tekshiruvni kutmoqda',
      icon: 'bi-hourglass-split'
    },
    {
      title: 'Jarayondagi vazifalar',
      value: inProgress,
      change: 'Tekshiruv olinmoqda',
      icon: 'bi-heart-pulse'
    },
    {
      title: 'Yakunlangan',
      value: completed,
      change: 'Natijasi tayyor',
      icon: 'bi-check-circle'
    },
  ]

  // Tekshiruvi yakunlangan vazifalar ulushi
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  // So'nggi 4 ta vazifa
  const recentTasks = tasks.slice(0, 4)

  return (
    <section className={s.Dashboard}>

      <div className={s.TopRow}>
        <div>
          <h1>Bosh sahifa</h1>
          <p>Xush kelibsiz, {user?.doctor?.first_name || 'Doktor'}</p>
        </div>
        <div className={s.TopBtns}>
          <button
            className={s.SecondaryBtn}
            onClick={() => setReloadKey(k => k + 1)}
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
            <h3>Vazifalar ro'yxati</h3>
          </div>

          {tasksLoading ? (
            <p className={s.Empty}>Yuklanmoqda...</p>
          ) : tasksError ? (
            <p className={s.Empty}>Xatolik: {tasksError}</p>
          ) : recentTasks.length === 0 ? (
            <p className={s.Empty}>Hozircha vazifalar mavjud emas</p>
          ) : (
            <ul>
              {recentTasks.map((t) => (
                <li key={t.id}>
                  <div className={s.PatientLeft}>
                    <div className={s.Avatar}>{t.avatar}</div>
                    <div>
                      <p>{t.name}</p>
                      <span>{t.task}</span>
                    </div>
                  </div>

                  <div className={s.TaskRight}>
                    <span className={`${s.Status} ${s[t.statusKey]}`}>
                      {t.statusLabel}
                    </span>

                    {/* {t.statusKey === 'pending' && (
                      <button
                        className={s.SecondaryBtn}
                        disabled={startingId === t.id}
                        onClick={() => handleStartTask(t.id)}
                      >
                        {startingId === t.id ? 'Boshlanmoqda...' : 'Boshlash'}
                      </button>
                    )} */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={s.ProgressCard}>
          <h3>Tekshiruvlar jarayoni</h3>
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

export default AssistantDoctorHome