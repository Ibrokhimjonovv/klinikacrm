import React, { useEffect, useState } from 'react';
import s from "./DoctorProgressPatients.module.scss"
import { useNavigate } from 'react-router-dom'
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('uz-UZ')
}

// Tashxis boshlangan va tugash sanasini, hamda bajarilish foizini hisoblaydi
const getPlanProgress = (plan) => {
    if (!plan) return null

    const days = plan.days || []
    const allItems = days.flatMap(d => d.items || [])
    const totalItems = allItems.length
    const checkedItems = allItems.filter(it => it.checked).length
    const percent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

    const startDate = plan.created_at || plan.start_date || (days[0]?.created_at) || null

    let endDate = plan.end_date || null
    if (!endDate && startDate && days.length > 0) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + (days.length - 1))
        endDate = d.toISOString()
    }

    let statusLabel = 'Boshlanmagan'
    if (percent === 100) statusLabel = 'Yakunlandi'
    else if (percent > 0) statusLabel = 'Jarayonda'
    else if (totalItems > 0) statusLabel = 'Boshlanmagan'

    return {
        diagnosis: plan.diagnosis || "Tashxis ko'rsatilmagan",
        totalItems,
        checkedItems,
        percent,
        startDate,
        endDate,
        totalDays: days.length,
        statusLabel,
    }
}

const DoctorProgressPatients = () => {
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
                const res = await fetch(`${api}/progresslist/`, {
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

                const formatted = data.map((patient, index) => {
                    // Eng so'nggi / faol davolash rejasi
                    const activePlan =
                        patient.active_treatment_plan ||
                        patient.treatment_plans?.[patient.treatment_plans.length - 1] ||
                        null

                    return {
                        id: patient.id || index + 1,
                        first_name: patient.first_name || '',
                        last_name: patient.last_name || '',
                        middle_name: patient.middle_name || '',
                        birth_date: patient.date_of_birth || null,
                        gender: patient.gender || '',
                        phone: patient.contact_number || '—',

                        treatment_plan: patient.treatment_plan,

                        progress: patient.progress,
                    }
                })

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
                    <h1>Jarayondagi bemorlar</h1>
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
                                <th>Boshlangan</th>
                                <th>Tugaydi</th>
                                <th>Progress</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} onClick={() => navigate(`/doctor-progress-patients/${p.id}`)}>
                                    <td>
                                        <div className={s.NameCell}>
                                            <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                            <span>{p.first_name} {p.last_name}</span>
                                        </div>
                                    </td>
                                    <td>{calcAge(p.birth_date)} yosh</td>
                                    <td>
                                        <DateTimeFormatter
                                            date={p.treatment_plan?.created_at}
                                            format="date"
                                        />
                                    </td>

                                    <td>
                                        <DateTimeFormatter
                                            date={p.treatment_plan?.finish_date}
                                            format="date"
                                        />
                                    </td>
                                    <td>
                                        <span
                                            className={`${s.StatusBadge} ${p.progress?.total_progress === 100
                                                ? s.done
                                                : p.progress?.total_progress > 0
                                                    ? s.active
                                                    : s.watch
                                                }`}
                                        >
                                            {p.progress?.total_progress === 0 ? (
                                                <span>Kutilmoqda</span>
                                            ) : p.progress?.total_progress === 100 ? (
                                                <span>Tugallangan</span>
                                            ) : (
                                                <span>Jarayonda</span>
                                            )}
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
                            onClick={() => navigate(`/doctor-progress-patients/${p.id}`)}
                        >
                            <div className={s.CardTop}>
                                <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                <span
                                    className={`${s.StatusBadge} ${p.progress?.total_progress === 100
                                        ? s.done
                                        : p.progress?.total_progress > 0
                                            ? s.active
                                            : s.watch
                                        }`}
                                >
                                    {p.progress?.total_progress === 0 ? (
                                        <span>Kutilmoqda</span>
                                    ) : p.progress?.total_progress === 100 ? (
                                        <span>Tugallangan</span>
                                    ) : (
                                        <span>Jarayonda</span>
                                    )}
                                </span>
                            </div>
                            <h3>{p.first_name} {p.last_name}</h3>
                            <p className={s.CardAge}>{calcAge(p.birth_date)} yosh · {p.gender === 'erkak' ? 'Erkak' : 'Ayol'}</p>
                        </div>
                    ))}
                </div>
            )}

        </div>
    )
}

export default DoctorProgressPatients