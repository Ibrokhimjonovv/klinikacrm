import React, { useEffect, useState } from 'react';
import s from "./AssistantDoctorPatients.module.scss"
import { useNavigate } from 'react-router-dom'
import { api } from '../../../App';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const STATUS_LABELS = {
    REQUESTED: 'Kutilmoqda',
    ASSIGNED: 'Kutilmoqda',
    IN_PROGRESS: 'Jarayonda',
    COMPLETED: 'Yakunlangan',
    NO_SHOW: 'Kelmagan',
    CANCELLED: 'Bekor qilingan',
}

// Backend javobi (DoctorTaskSerializer) shu yerda bitta joyda
// moslanadi. Maydon nomlari serializerdagi nomlardan farq
// qilsa, FAQAT shu funksiyani o'zgartirasiz.
const normalizeTask = (t, index) => {
    const patient = t.medical_visit?.patient || t.patient || {}
    const raw = String(t.status || '').toUpperCase()

    let statusKey = 'pending'
    if (['IN_PROGRESS', 'PROGRESS'].includes(raw)) statusKey = 'progress'
    else if (['COMPLETED', 'DONE'].includes(raw)) statusKey = 'done'
    else if (['CANCELLED', 'NO_SHOW'].includes(raw)) statusKey = 'cancelled'

    return {
        id: t.id || index + 1,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        middle_name: patient.middle_name || '',
        birth_date: patient.date_of_birth || null,
        gender: patient.gender || '',
        phone: patient.contact_number || '—',
        service: t.service?.name || t.service_name || "Ko'rsatilmagan",
        statusRaw: t.status,
        statusKey,
        statusLabel: STATUS_LABELS[t.status] || t.status,
    }
}

const AssistantDoctorPatients = () => {
    const navigate = useNavigate()
    const [view, setView] = useState('table') // 'table' | 'card'
    const [search, setSearch] = useState('')

    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setLoading(true)
                setError(null)
                const token = localStorage.getItem('hospital_access')
                const res = await fetch(`${api}/doctor/my-tasks/`, {
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
                const list = Array.isArray(data) ? data : data.results || []

                setTasks(list.map(normalizeTask))
            } catch (err) {
                console.error('API xatosi:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchTasks()
    }, [])

    const filtered = tasks.filter(p => {
        const fullName = `${p.first_name} ${p.last_name} ${p.middle_name}`.toLowerCase()
        return fullName.includes(search.toLowerCase())
    })

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
                    <h1>Sizga biriktirilgan vazifalar</h1>
                    <p>Diagnostikaga yuborilgan bemorlar ro'yxati</p>
                </div>

                <div className={s.ViewSwitch}>
                    <button
                        className={view === 'table' ? s.Active : ''}
                        onClick={() => setView('table')}
                    >
                        <i className="bi bi-list-ul"></i>
                    </button>
                    <button
                        className={view === 'card' ? s.Active : ''}
                        onClick={() => setView('card')}
                    >
                        <i className="bi bi-grid-3x3-gap-fill"></i>
                    </button>
                </div>
            </div>

            <div className={s.SearchRow}>
                <div className={s.SearchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Bemor ismi bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {filtered.length === 0 && (
                <p className={s.Empty}>Hech qanday vazifa topilmadi</p>
            )}

            {view === 'table' && filtered.length > 0 && (
                <div className={s.TableWrap}>
                    <table className={s.Table}>
                        <thead>
                            <tr>
                                <th>F.I.O</th>
                                <th>Yoshi</th>
                                <th>Telefon</th>
                                <th>Xizmat</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} onClick={() => navigate(`/waiting-patients/${p.id}`)}>
                                    <td>
                                        <div className={s.NameCell}>
                                            <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                            <span>{p.first_name} {p.last_name}</span>
                                        </div>
                                    </td>
                                    <td>{calcAge(p.birth_date)} yosh</td>
                                    <td>{p.phone}</td>
                                    <td>{p.service}</td>
                                    <td>
                                        <span className={`${s.StatusBadge} ${s[p.statusKey]}`}>
                                            {p.statusLabel}
                                        </span>
                                    </td>
                                    <td className={s.ArrowCell}><i className="bi bi-chevron-right"></i></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'card' && filtered.length > 0 && (
                <div className={s.CardsGrid}>
                    {filtered.map(p => (
                        <div
                            key={p.id}
                            className={s.PatientCard}
                            onClick={() => navigate(`/waiting-patients/${p.id}`)}
                        >
                            <div className={s.CardTop}>
                                <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                <span className={`${s.StatusBadge} ${s[p.statusKey]}`}>
                                    {p.statusLabel}
                                </span>
                            </div>
                            <h3>{p.first_name} {p.last_name}</h3>
                            <p className={s.CardAge}>{calcAge(p.birth_date)} yosh · {p.gender === 'erkak' ? 'Erkak' : 'Ayol'}</p>
                            <div className={s.CardInfo}>
                                <span><i className="bi bi-clipboard2-pulse"></i> {p.service}</span>
                                <span><i className="bi bi-telephone"></i> {p.phone}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    )
}

export default AssistantDoctorPatients