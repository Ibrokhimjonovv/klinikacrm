import React, { useEffect, useState, useCallback } from 'react';
import s from "./NurseInpatients.module.scss"
import { api } from '../../../App';

const STATUS_MAP = {
  WAITING: { label: 'Kutilmoqda', key: 'pending' },
  IN_PROGRESS: { label: 'Jarayonda', key: 'progress' },
  DONE: { label: 'Bajarildi', key: 'done' },
}

const TABS = [
  { key: 'ALL', label: 'Barchasi' },
  { key: 'WAITING', label: 'Kutilmoqda' },
  { key: 'IN_PROGRESS', label: 'Jarayonda' },
  { key: 'DONE', label: 'Bajarilgan' },
]

const NurseInpatients = () => {

  const [listData, setListData] = useState({
    waiting: [],
    in_progress: [],
    completed: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [activeTab, setActiveTab] = useState('ALL')

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
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Muolajalarni olishda xatolik:', err)
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
      console.error('Muolajani boshlashda xatolik:', err)
      alert(err.message || 'Muolajani boshlashda xatolik yuz berdi')
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
      console.error('Muolajani tugatishda xatolik:', err)
      alert(err.message || 'Muolajani tugatishda xatolik yuz berdi')
    } finally {
      setActionLoadingId(null)
    }
  }

  const { waiting, in_progress, completed } = listData

  const combinedList = [...waiting, ...in_progress, ...completed]
    .sort((a, b) => a.id - b.id)

  const visibleList = activeTab === 'ALL'
    ? combinedList
    : combinedList.filter(item => item.status === activeTab)

  const getPatientName = (patient) => {
    if (!patient) return "Noma'lum"
    return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || "Noma'lum"
  }

  const getDoctorsLabel = (doctors) => {
    if (!doctors || doctors.length === 0) return null
    return doctors.map(d => `${d.first_name || ''} ${d.last_name || ''}`.trim()).join(', ')
  }

  return (
    <section className={s.Dashboard}>

      <div className={s.TopRow}>
        <div>
          <h1>Yotib davolanayotgan bemorlar</h1>
          <p>Sizga biriktirilgan bemorlar va muolajalar ro'yxati</p>
        </div>
      </div>

      <div className={s.PatientsCard}>
        <div className={s.UpcomingHead}>
          <h3>Yotib davolanayotgan bemorlar</h3>
          <div className={s.Tabs}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`${s.TabBtn} ${activeTab === tab.key ? s.TabBtnActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className={s.Empty}>Yuklanmoqda...</p>
        ) : error ? (
          <p className={s.Empty}>Xatolik: {error}</p>
        ) : visibleList.length === 0 ? (
          <p className={s.Empty}>Bu bo'limda bemorlar mavjud emas</p>
        ) : (
          <ul>
            {visibleList.map((item) => {
              const statusInfo = STATUS_MAP[item.status] || { label: item.status, key: 'pending' }
              const doctorsLabel = getDoctorsLabel(item.doctors)

              return (
                <li key={item.id}>
                  <div className={s.PatientLeft}>
                    <div className={s.Avatar}>
                      {item.patient?.first_name ? item.patient.first_name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <p>{getPatientName(item.patient)}</p>
                      <span>{item.treatment || "Ko'rsatilmagan"}</span>
                      <div className={s.MetaRow}>
                        <span className={s.MetaTag}>Kun {item.day_number}</span>
                        {doctorsLabel && <span className={s.MetaTag}>{doctorsLabel}</span>}
                      </div>
                    </div>
                  </div>

                  <div className={s.RowRight}>
                    <span className={`${s.Status} ${s[statusInfo.key]}`}>
                      {statusInfo.label}
                    </span>

                    {item.status === 'WAITING' && (
                      <button
                        className={s.ActionBtn}
                        disabled={actionLoadingId === item.id}
                        onClick={() => handleStart(item.id)}
                      >
                        {actionLoadingId === item.id ? '...' : 'Boshlash'}
                      </button>
                    )}

                    {item.status === 'IN_PROGRESS' && (
                      <button
                        className={`${s.ActionBtn} ${s.ActionBtnDone}`}
                        disabled={actionLoadingId === item.id}
                        onClick={() => handleComplete(item.id)}
                      >
                        {actionLoadingId === item.id ? '...' : 'Tugatish'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </section>
  )
}

export default NurseInpatients