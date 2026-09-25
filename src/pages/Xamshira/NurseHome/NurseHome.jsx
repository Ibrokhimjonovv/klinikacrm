import React, { useEffect, useState, useCallback } from 'react';
import s from "./NurseHome.module.scss"
import { useAppContext } from '../../../context/context'
import { api } from '../../../App';

const STATUS_MAP = {
  WAITING: { label: 'Kutilmoqda', key: 'pending' },
  IN_PROGRESS: { label: 'Jarayonda', key: 'progress' },
  DONE: { label: 'Yakunlandi', key: 'done' },
}

const NurseHome = () => {
  const { user } = useAppContext()

  const [listData, setListData] = useState({
    waiting: [],
    in_progress: [],
    completed: [],
    waiting_count: 0,
    in_progress_count: 0,
    completed_count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const getHeaders = () => {
    const token = localStorage.getItem('hospital_access')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  const fetchAll = useCallback(async (signal) => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${api}/nurse/treatments/`, {
        method: 'GET',
        headers: getHeaders(),
        signal,
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      const data = await res.json()

      setListData({
        waiting: data.waiting || [],
        in_progress: data.in_progress || [],
        completed: data.completed || [],
        waiting_count: data.waiting_count ?? 0,
        in_progress_count: data.in_progress_count ?? 0,
        completed_count: data.completed_count ?? 0,
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Davolashlarni olishda xatolik:', err)
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAll(controller.signal)
    return () => controller.abort()
  }, [fetchAll])

  const handleStart = async (id) => {
    try {
      setActionLoadingId(id)
      const res = await fetch(`${api}/nurse/treatments/${id}/start/`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`)
      await fetchAll()
    } catch (err) {
      console.error('Davolashni boshlashda xatolik:', err)
      alert(err.message || 'Davolashni boshlashda xatolik yuz berdi')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleComplete = async (id) => {
    try {
      setActionLoadingId(id)
      const res = await fetch(`${api}/nurse/treatments/${id}/complete/`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`)
      await fetchAll()
    } catch (err) {
      console.error('Davolashni tugatishda xatolik:', err)
      alert(err.message || 'Davolashni tugatishda xatolik yuz berdi')
    } finally {
      setActionLoadingId(null)
    }
  }

  const { waiting, in_progress, completed, waiting_count, in_progress_count, completed_count } = listData
  const totalCount = waiting_count + in_progress_count + completed_count

  const stats = [
    {
      title: 'Jami davolashlar',
      value: totalCount,
      change: 'Umumiy ro\'yxat',
      icon: 'bi-people-fill',
      dark: true
    },
    {
      title: 'Kutilayotgan',
      value: waiting_count,
      change: 'Boshlanmagan',
      icon: 'bi-hourglass-split'
    },
    {
      title: 'Jarayondagi',
      value: in_progress_count,
      change: 'Xonada',
      icon: 'bi-heart-pulse'
    },
    {
      title: 'Yakunlangan',
      value: completed_count,
      change: 'Tugatilgan',
      icon: 'bi-check-circle'
    },
  ]

  const progressPercent = totalCount > 0
    ? Math.round((completed_count / totalCount) * 100)
    : 0

  const recentTreatments = [...waiting, ...in_progress, ...completed]
    .sort((a, b) => a.id - b.id)
    .slice(0, 4)
    .map(t => {
      const statusInfo = STATUS_MAP[t.status] || { label: t.status, key: 'pending' }
      const patient = t.patient || {}

      return {
        id: t.id,
        name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "Noma'lum",
        task: t.treatment || "Ko'rsatilmagan",
        avatar: patient.first_name ? patient.first_name[0].toUpperCase() : '?',
        statusLabel: statusInfo.label,
        statusKey: statusInfo.key,
        status: t.status,
      }
    })

  return (
    <section className={s.Dashboard}>

      <div className={s.TopRow}>
        <div>
          <h1>Bosh sahifa</h1>
          <p>Xush kelibsiz, {user?.nurse?.first_name || 'Hamshira'}</p>
        </div>
        <div className={s.TopBtns}>
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
            <h3>Davolashlar ro'yxati</h3>
          </div>

          {loading ? (
            <p className={s.Empty}>Yuklanmoqda...</p>
          ) : error ? (
            <p className={s.Empty}>Xatolik: {error}</p>
          ) : recentTreatments.length === 0 ? (
            <p className={s.Empty}>Hozircha davolashlar mavjud emas</p>
          ) : (
            <ul>
              {recentTreatments.map((t) => (
                <li key={t.id}>
                  <div className={s.PatientLeft}>
                    <div className={s.Avatar}>{t.avatar}</div>
                    <div>
                      <p>{t.name}</p>
                      <span>{t.task}</span>
                    </div>
                  </div>

                  <div className={s.RowRight}>
                    <span className={`${s.Status} ${s[t.statusKey]}`}>
                      {t.statusLabel}
                    </span>

                    {t.status === 'WAITING' && (
                      <button
                        className={s.ActionBtn}
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleStart(t.id)}
                      >
                        {actionLoadingId === t.id ? '...' : 'Boshlash'}
                      </button>
                    )}

                    {t.status === 'IN_PROGRESS' && (
                      <button
                        className={`${s.ActionBtn} ${s.ActionBtnDone}`}
                        disabled={actionLoadingId === t.id}
                        onClick={() => handleComplete(t.id)}
                      >
                        {actionLoadingId === t.id ? '...' : 'Tugatish'}
                      </button>
                    )}
                  </div>
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

export default NurseHome