import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './AssistantDoctorTasks.module.scss';
import { api } from '../../../App';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const taskPatient = (task) => task?.patient_detail || null
const taskService = (task) => task?.service_detail || null
const taskDiagnosis = (task) => task?.treatment_plan_detail?.diagnosis || null
const taskServiceName = (task) => taskService(task)?.name || "Ko'rsatilmagan"

const STATUS_LABELS = {
    WAITING: { label: 'Kutilmoqda', className: 'watch' },
    IN_PROGRESS: { label: 'Jarayonda', className: 'active' },
    DONE: { label: 'Bajarildi', className: 'done' },
    CANCELLED: { label: 'Bekor qilindi', className: 'cancelled' },
}

const AssistantDoctorTasks = () => {
    const navigate = useNavigate()

    const [view, setView] = useState('table')
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

                const res = await fetch(`${api}/doctor/treatment-services/`, {
                    method: 'GET',
                    headers: authHeaders(token),
                })
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                const data = await res.json()
                setTasks(Array.isArray(data) ? data : (data.results || []))
            } catch (err) {
                console.error('Xizmatlarni olishda xatolik:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchTasks()
    }, [])

    const filtered = tasks.filter(task => {
        const patient = taskPatient(task)
        const fullName = `${patient?.first_name || ''} ${patient?.last_name || ''} ${patient?.middle_name || ''}`.toLowerCase()
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
                    <h1>Menga biriktirilgan bemorlar</h1>
                    <p>Bajarishingiz kerak bo'lgan muolajalar ro'yxati</p>
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
                                <th>Telefon</th>
                                <th>Xizmat</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(task => {
                                const patient = taskPatient(task)
                                const statusInfo = STATUS_LABELS[task.status] || STATUS_LABELS.WAITING

                                return (
                                    <tr key={task.id} onClick={() =>
                                        navigate(
                                            `/assistant-doctor/tasks/${task.treatment_plan_id}/${task.service_id}`
                                        )
                                    }>
                                        <td>
                                            <div className={s.NameCell}>
                                                <div className={s.Avatar}>{patient?.first_name ? patient.first_name[0] : '?'}</div>
                                                <div>
                                                    <span>{patient?.first_name} {patient?.last_name}</span>
                                                    {/* {taskDiagnosis(task) && (
                                                        <p className={s.NameCellSub}>{taskDiagnosis(task)}</p>
                                                    )} */}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{calcAge(patient?.date_of_birth)} yosh</td>
                                        <td>{patient?.contact_number || '—'}</td>
                                        <td>{taskServiceName(task)}</td>
                                        <td>
                                            <span className={`${s.StatusBadge} ${s[statusInfo.className]}`}>
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
                    {filtered.map(task => {
                        const patient = taskPatient(task)
                        const statusInfo = STATUS_LABELS[task.status] || STATUS_LABELS.WAITING

                        return (
                            <div
                                key={task.id}
                                className={s.PatientCard}
                                onClick={() =>
                                    navigate(
                                        `/assistant-doctor/tasks/${task.treatment_plan_id}/${task.service_id}`
                                    )
                                }
                            >
                                <div className={s.CardTop}>
                                    <div className={s.Avatar}>{patient?.first_name ? patient.first_name[0] : '?'}</div>
                                    <span className={`${s.StatusBadge} ${s[statusInfo.className]}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <h3>{patient?.first_name} {patient?.last_name}</h3>
                                <p className={s.CardAge}>
                                    {calcAge(patient?.date_of_birth)} yosh · {patient?.gender === 'erkak' ? 'Erkak' : 'Ayol'}
                                </p>

                                {/* {taskDiagnosis(task) && (
                                    <p className={s.NameCellSub}>{taskDiagnosis(task)}</p>
                                )} */}

                                <div className={s.CardInfo}>
                                    <span><i className="bi bi-clipboard2-pulse"></i> {taskServiceName(task)}</span>
                                    <span><i className="bi bi-telephone"></i> {patient?.contact_number || '—'}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    )
}

export default AssistantDoctorTasks