import React, { useEffect, useState } from 'react';
import s from "./DoctorComplatedPatients.module.scss"
import { useNavigate } from 'react-router-dom'
import { api } from '../../../../App';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const getStatusInfo = (progress) => {
    const p = progress ?? 0
    if (p >= 100) return { label: 'Tugallangan', key: 'done' }
    if (p > 0) return { label: 'Jarayonda', key: 'active' }
    return { label: 'Kutilmoqda', key: 'watch' }
}

const DoctorComplatedPatients = () => {
    const navigate = useNavigate()
    const [view, setView] = useState('table') // 'table' | 'card'
    const [search, setSearch] = useState('')

    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem('hospital_access')
                const res = await fetch(`${api}/donelist/`, {
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

                const formatted = data.map((patient, index) => ({
                    id: patient.id || index + 1,
                    first_name: patient.first_name || '',
                    last_name: patient.last_name || '',
                    middle_name: patient.middle_name || '',
                    birth_date: patient.date_of_birth || null,
                    gender: patient.gender || '',
                    phone: patient.contact_number || '—',
                    plansCount: patient.treatment_plan?.length || 0,
                    progress: patient.progress?.total_progress ?? 0,
                }))

                setPatients(formatted)
            } catch (err) {
                console.error('API xatosi:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchPatients()
    }, [])

    const filtered = patients.filter(p => {
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
                    <h1>Yakunlangan bemorlar</h1>
                    <p>Sizga biriktirilgan bemorlar ro'yxati</p>
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
                <p className={s.Empty}>Hech qanday bemor topilmadi</p>
            )}

            {view === 'table' && filtered.length > 0 && (
                <div className={s.TableWrap}>
                    <table className={s.Table}>
                        <thead>
                            <tr>
                                <th>F.I.O</th>
                                <th>Yoshi</th>
                                <th>Jami reja</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const statusInfo = getStatusInfo(p.progress)
                                return (
                                    <tr key={p.id} onClick={() => navigate(`/doctor-complated-patients/${p.id}`)}>
                                        <td>
                                            <div className={s.NameCell}>
                                                <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                                <span>{p.first_name} {p.last_name}</span>
                                            </div>
                                        </td>
                                        <td>{calcAge(p.birth_date)} yosh</td>
                                        <td>{p.plansCount} ta</td>
                                        <td>
                                            <span className={`${s.StatusBadge} ${s[statusInfo.key]}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className={s.ArrowCell}><i className="bi bi-chevron-right"></i></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'card' && filtered.length > 0 && (
                <div className={s.CardsGrid}>
                    {filtered.map(p => {
                        const statusInfo = getStatusInfo(p.progress)
                        return (
                            <div
                                key={p.id}
                                className={s.PatientCard}
                                onClick={() => navigate(`/doctor-complated-patients/${p.id}`)}
                            >
                                <div className={s.CardTop}>
                                    <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                    <span className={`${s.StatusBadge} ${s[statusInfo.key]}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <h3>{p.first_name} {p.last_name}</h3>
                                <p className={s.CardAge}>{calcAge(p.birth_date)} yosh · {p.gender === 'erkak' ? 'Erkak' : 'Ayol'}</p>
                                <p className={s.CardPlans}><i className="bi bi-clipboard2-pulse"></i> {p.plansCount} ta reja</p>
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    )
}

export default DoctorComplatedPatients