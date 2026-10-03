import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import s from "./NurseHome.module.scss"
import { useAppContext } from '../../../context/context'
import { api } from '../../../App';

// ------------------------------------------------------------
// Bemorlar ro'yxatidagi (NurseInpatients) bilan bir xil mantiq:
// yozuvlar REJA (treatment_plan_id) bo'yicha guruhlanadi.
// ------------------------------------------------------------
const groupByPlan = (waiting, inProgress, completed) => {
  const all = [...waiting, ...inProgress, ...completed]
  const map = new Map()

  for (const item of all) {
    const patient = item.patient || {}
    const planId = item.treatment_plan_id

    if (!map.has(planId)) {
      map.set(planId, {
        planId,
        patientId: patient.id,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        diagnosis:
          item.diagnosis ||
          item.plan?.diagnosis ||
          item.treatment_plan?.diagnosis ||
          item.treatment_plan_diagnosis ||
          null,
        total: 0,
        waitingCount: 0,
        progressCount: 0,
        doneCount: 0,
      })
    }

    const entry = map.get(planId)
    entry.total++
    if (item.status === 'WAITING') entry.waitingCount++
    else if (item.status === 'IN_PROGRESS') entry.progressCount++
    else if (item.status === 'DONE') entry.doneCount++
  }

  return Array.from(map.values()).map(entry => {
    let statusKey = 'pending'
    let statusLabel = 'Kutilmoqda'

    if (entry.progressCount > 0 || (entry.doneCount > 0 && entry.waitingCount > 0)) {
      statusKey = 'progress'
      statusLabel = 'Jarayonda'
    } else if (entry.waitingCount === 0 && entry.doneCount > 0) {
      statusKey = 'done'
      statusLabel = 'Yakunlangan'
    }

    return { ...entry, statusKey, statusLabel }
  })
}

const NurseHome = () => {
  const { user } = useAppContext()
  const navigate = useNavigate()

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

  // ✅ Bemorlar ro'yxatidagi rejalar ichidan eng oxirgi 5 tasi.
  // "Eng oxirgi" = eng katta treatment_plan_id (eng yangi yaratilgan reja).
  const recentPlans = groupByPlan(waiting, in_progress, completed)
    .sort((a, b) => b.planId - a.planId)
    .slice(0, 5)
    .map(p => ({
      planId: p.planId,
      name: `${p.first_name} ${p.last_name}`.trim() || "Noma'lum",
      task: p.diagnosis || `№${p.planId}-reja`,
      progress: `${p.doneCount}/${p.total} bajarilgan`,
      avatar: p.first_name ? p.first_name[0].toUpperCase() : '?',
      statusLabel: p.statusLabel,
      statusKey: p.statusKey,
    }))

  // Qatorga bosilganda REJA detail sahifasiga o'tadi
  // (detail sahifa endi bemor id emas, planId kutadi)
  const goToInpatientDetail = (planId) => {
    if (planId == null) return
    navigate(`/nurse/inpatient/${planId}`)
  }

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
            <h3>So'nggi bemorlar</h3>
          </div>

          {loading ? (
            <p className={s.Empty}>Yuklanmoqda...</p>
          ) : error ? (
            <p className={s.Empty}>Xatolik: {error}</p>
          ) : recentPlans.length === 0 ? (
            <p className={s.Empty}>Hozircha bemorlar mavjud emas</p>
          ) : (
            <ul>
              {recentPlans.slice(0, 10).map((p) => (
                <li
                  key={p.planId}
                  className={s.ClickableRow}
                  onClick={() => goToInpatientDetail(p.planId)}
                >
                  <div className={s.PatientLeft}>
                    <div className={s.Avatar}>{p.avatar}</div>
                    <div>
                      <p>{p.name}</p>
                      <span>{p.task} · {p.progress}</span>
                    </div>
                  </div>

                  <div className={s.RowRight}>
                    <span className={`${s.Status} ${s[p.statusKey]}`}>
                      {p.statusLabel}
                    </span>
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