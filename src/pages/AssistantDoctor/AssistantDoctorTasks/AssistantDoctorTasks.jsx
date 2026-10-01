import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './AssistantDoctorTasks.module.scss';
import { api } from '../../../App';
import { useToast } from '../../../context/ToastContext'; // ⚠️ qo'shildi

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

// ⚠️ To'lov holatini har xil joydan tekshiramiz
const todayStr = () => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Bugungi kun; bo'lmasa, birinchi bajarilmagan kun
const currentDay = (task) => {
    const days = task?.days || []
    return (
        days.find((d) => d.date === todayStr()) ||
        days.find((d) => d.display_status !== 'DONE' && d.display_status !== 'CANCELLED') ||
        null
    )
}

// To'lov: shu kunning to'lovi bo'yicha (qisman to'langan rejalar uchun to'g'ri)
const isTaskPaid = (task) => {
    if (!task) return false
    const day = currentDay(task)
    if (day) return day.payment?.status === 'PAID'
    return task.payment_summary?.status === 'PAID'
}

// Holat: API da task.status yo'q, kunning display_status idan olamiz
const taskStatus = (task) => {
    const st = currentDay(task)?.display_status
    return st === 'DONE' || st === 'IN_PROGRESS' || st === 'CANCELLED' ? st : 'WAITING'
}

// API javobida task.id yo'q, shuning uchun kalit yasaymiz
const taskKey = (task) => `${task.treatment_plan_id}-${task.service_id}`

const STATUS_LABELS = {
    WAITING: { label: 'Kutilmoqda', className: 'watch' },
    IN_PROGRESS: { label: 'Jarayonda', className: 'active' },
    DONE: { label: 'Bajarildi', className: 'done' },
    CANCELLED: { label: 'Bekor qilindi', className: 'cancelled' },
}

const AssistantDoctorTasks = () => {
    const navigate = useNavigate()
    const { showToast } = useToast() // ⚠️ qo'shildi

    const [view, setView] = useState('table')
    const [search, setSearch] = useState('')

    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [payFilter, setPayFilter] = useState('ALL')       // ALL | PAID | UNPAID
    const [statusFilter, setStatusFilter] = useState('ALL') // ALL | WAITING | IN_PROGRESS | DONE | CANCELLED

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

    const paidCount = tasks.filter(t => isTaskPaid(t)).length
    const unpaidCount = tasks.length - paidCount
    const countByStatus = (key) => tasks.filter(t => taskStatus(t) === key).length

    const filtered = tasks.filter(task => {
        const patient = taskPatient(task)
        const fullName = `${patient?.first_name || ''} ${patient?.last_name || ''} ${patient?.middle_name || ''}`.toLowerCase()
        const matchName = fullName.includes(search.toLowerCase())

        const paid = isTaskPaid(task)
        const matchPay =
            payFilter === 'ALL' ||
            (payFilter === 'PAID' && paid) ||
            (payFilter === 'UNPAID' && !paid)

        const matchStatus = statusFilter === 'ALL' || taskStatus(task) === statusFilter

        return matchName && matchPay && matchStatus
    })

    // ⚠️ Qatorga bosish: faqat to'langan bo'lsa detail sahifaga o'tadi
    const handleRowClick = (task) => {
        if (!isTaskPaid(task)) {
            showToast(
                "Bu bemor hali to'lov qilmagan. Avval kassadan to'lovni amalga oshiring.",
                'warning'
            )
            return
        }
        navigate(`/doctor/patients/task/${task.treatment_plan_id}/${task.service_id}`)
    }

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
                <div className={s.FilterTabs}>
                    {[
                        { key: 'ALL', label: 'Barchasi', count: tasks.length },
                        { key: 'PAID', label: "To'langan", count: paidCount },
                        { key: 'UNPAID', label: "To'lanmagan", count: unpaidCount },
                    ].map((f) => (
                        <button
                            key={f.key}
                            className={payFilter === f.key ? s.FilterActive : ''}
                            onClick={() => setPayFilter(f.key)}
                        >
                            {f.label} <span className={s.FilterCount}>{f.count}</span>
                        </button>
                    ))}
                </div>

                <div className={s.FilterTabs}>
                    {[
                        { key: 'ALL', label: 'Barcha holat', count: tasks.length },
                        { key: 'WAITING', label: 'Kutilmoqda', count: countByStatus('WAITING') },
                        { key: 'IN_PROGRESS', label: 'Jarayonda', count: countByStatus('IN_PROGRESS') },
                        { key: 'DONE', label: 'Bajarildi', count: countByStatus('DONE') },
                        { key: 'CANCELLED', label: 'Bekor', count: countByStatus('CANCELLED') },
                    ].map((f) => (
                        <button
                            key={f.key}
                            className={statusFilter === f.key ? s.FilterActive : ''}
                            onClick={() => setStatusFilter(f.key)}
                        >
                            {f.label} <span className={s.FilterCount}>{f.count}</span>
                        </button>
                    ))}
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
                                <th>To'lov</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(task => {
                                const patient = taskPatient(task)
                                const statusInfo = STATUS_LABELS[taskStatus(task)] || STATUS_LABELS.WAITING
                                const isPaid = isTaskPaid(task) // ⚠️

                                return (
                                    <tr
                                        key={taskKey(task)}
                                        onClick={() => handleRowClick(task)}
                                        className={!isPaid ? s.RowDisabled : ''}
                                    >
                                        <td>
                                            <div className={s.NameCell}>
                                                <div className={s.Avatar}>
                                                    {patient?.first_name ? patient.first_name[0] : '?'}
                                                </div>
                                                <div>
                                                    <span>{patient?.first_name} {patient?.last_name}</span>
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
                                        {/* ⚠️ To'lov ustuni */}
                                        <td>
                                            <span className={`${s.StatusBadge} ${isPaid ? s.paid : s.unpaid}`}>
                                                {isPaid ? "To'langan" : "To'lanmagan"}
                                            </span>
                                        </td>
                                        <td className={s.ArrowCell}>
                                            {isPaid ? (
                                                <i className="bi bi-chevron-right"></i>
                                            ) : (
                                                <i className="bi bi-lock"></i>
                                            )}
                                        </td>
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
                        const statusInfo = STATUS_LABELS[taskStatus(task)] || STATUS_LABELS.WAITING
                        const isPaid = isTaskPaid(task) // ⚠️

                        return (
                            <div
                                key={taskKey(task)}
                                className={`${s.PatientCard} ${!isPaid ? s.CardDisabled : ''}`}
                                onClick={() => handleRowClick(task)}
                            >
                                <div className={s.CardTop}>
                                    <div className={s.Avatar}>
                                        {patient?.first_name ? patient.first_name[0] : '?'}
                                    </div>
                                    <span className={`${s.StatusBadge} ${isPaid ? s.paid : s.unpaid}`}>
                                        {isPaid ? "To'langan" : "To'lanmagan"}
                                    </span>
                                </div>
                                <h3>{patient?.first_name} {patient?.last_name}</h3>
                                <p className={s.CardAge}>
                                    {calcAge(patient?.date_of_birth)} yosh
                                    {patient?.gender ? ` · ${patient.gender === 'erkak' ? 'Erkak' : 'Ayol'}` : ''}
                                </p>

                                <div className={s.CardInfo}>
                                    <span><i className="bi bi-clipboard2-pulse"></i> {taskServiceName(task)}</span>
                                    <span><i className="bi bi-telephone"></i> {patient?.contact_number || '—'}</span>
                                    <span>
                                        <i className="bi bi-activity"></i>
                                        <span className={`${s.StatusBadge} ${s[statusInfo.className]}`}>
                                            {statusInfo.label}
                                        </span>
                                    </span>
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