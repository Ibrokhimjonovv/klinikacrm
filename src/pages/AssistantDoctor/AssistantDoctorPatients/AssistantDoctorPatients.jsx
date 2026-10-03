import React, { useEffect, useState } from 'react';
import s from "./AssistantDoctorPatients.module.scss"
import { useNavigate } from 'react-router-dom'
import { api } from '../../../App';
import { useToast } from '../../../context/ToastContext'; // ⚠️ qo'shildi
import Pagination from '../../../components/shared/Pagination/Pagination';
import usePagination from '../../../components/shared/Pagination/usePagination';

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

// Backend javobi (DoctorTaskSerializer) shu yerda bitta joyda moslanadi.
const normalizeTask = (t, index) => {
    const patient = t.medical_visit?.patient || t.patient || {}
    const raw = String(t.status || '').toUpperCase()

    let statusKey = 'pending'
    if (['IN_PROGRESS', 'PROGRESS'].includes(raw)) statusKey = 'progress'
    else if (['COMPLETED', 'DONE'].includes(raw)) statusKey = 'done'
    else if (['CANCELLED', 'NO_SHOW'].includes(raw)) statusKey = 'cancelled'

    // ⚠️ To'lov holati: bir nechta joydan tekshiriladi
    const isPaid = !!(
        t.is_paid ||
        t.service_detail?.is_paid ||
        t.result?.examination_request_detail?.is_paid ||
        t.medical_visit?.is_paid ||
        false
    )

    return {
        id: t.id || index + 1,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        middle_name: patient.middle_name || '',
        birth_date: patient.birth_date || null,
        gender: patient.gender || '',
        phone: patient.contact_number || '—',
        service: t.service?.name || t.service_name || "Ko'rsatilmagan",
        statusRaw: t.status,
        statusKey,
        statusLabel: STATUS_LABELS[t.status] || t.status,
        isPaid, // ⚠️ qo'shildi
    }
}

const AssistantDoctorPatients = () => {
    const navigate = useNavigate()
    const { showToast } = useToast() // ⚠️ qo'shildi
    const [view, setView] = useState('table') // 'table' | 'card'
    const [search, setSearch] = useState('')

    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [payFilter, setPayFilter] = useState('ALL') // ALL | PAID | UNPAID
    const [statusFilter, setStatusFilter] = useState('ALL') // ALL | pending | progress | done | cancelled

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

    const paidCount = tasks.filter(p => p.isPaid).length
    const unpaidCount = tasks.length - paidCount

    const countByStatus = (key) => tasks.filter(p => p.statusKey === key).length

    const filtered = tasks.filter(p => {
        const fullName = `${p.first_name} ${p.last_name} ${p.middle_name}`.toLowerCase()
        const matchName = fullName.includes(search.toLowerCase())
        const matchPay =
            payFilter === 'ALL' ||
            (payFilter === 'PAID' && p.isPaid) ||
            (payFilter === 'UNPAID' && !p.isPaid)
        const matchStatus = statusFilter === 'ALL' || p.statusKey === statusFilter
        return matchName && matchPay && matchStatus
    })

    const {
        pageItems,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
    } = usePagination(filtered, 100)

    // ⚠️ Qatorga bosish: faqat to'langan bo'lsa detail sahifaga o'tadi
    const handleRowClick = (p) => {
        if (!p.isPaid) {
            showToast(
                "Bu bemor hali to'lov qilmagan. Avval kassadan to'lovni amalga oshiring.",
                'warning'
            )
            return
        }
        navigate(`/doctor/patients/waiting/${p.id}`)
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
                    <h1>Sizga biriktirilgan diagnostik vazifalar</h1>
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
                        { key: 'pending', label: 'Kutilmoqda', count: countByStatus('pending') },
                        { key: 'progress', label: 'Jarayonda', count: countByStatus('progress') },
                        { key: 'done', label: 'Yakunlangan', count: countByStatus('done') },
                        { key: 'cancelled', label: 'Bekor', count: countByStatus('cancelled') },
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
                                <th>To'lov</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map(p => (
                                <tr
                                    key={p.id}
                                    onClick={() => handleRowClick(p)}
                                    className={!p.isPaid ? s.RowDisabled : ''}
                                >
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
                                    <td>
                                        <span className={`${s.StatusBadge} ${p.isPaid ? s.paid : s.unpaid}`}>
                                            {p.isPaid ? "To'langan" : "To'lanmagan"}
                                        </span>
                                    </td>
                                    <td className={s.ArrowCell}>
                                        {p.isPaid ? (
                                            <i className="bi bi-chevron-right"></i>
                                        ) : (
                                            <i className="bi bi-lock"></i>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {view === 'card' && filtered.length > 0 && (
                <div className={s.CardsGrid}>
                    {pageItems.map(p => (
                        <div
                            key={p.id}
                            className={`${s.PatientCard} ${!p.isPaid ? s.CardDisabled : ''}`}
                            onClick={() => handleRowClick(p)}
                        >
                            <div className={s.CardTop}>
                                <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                <span className={`${s.StatusBadge} ${p.isPaid ? s.paid : s.unpaid}`}>
                                    {p.isPaid ? "To'langan" : "To'lanmagan"}
                                </span>
                            </div>
                            <h3>{p.first_name} {p.last_name}</h3>
                            <p className={s.CardAge}>
                                {calcAge(p.birth_date)} yosh · {p.gender === 'erkak' ? 'Erkak' : 'Ayol'}
                            </p>
                            <div className={s.CardInfo}>
                                <span><i className="bi bi-clipboard2-pulse"></i> {p.service}</span>
                                <span><i className="bi bi-telephone"></i> {p.phone}</span>
                                <span>
                                    <i className="bi bi-activity"></i>
                                    <span className={`${s.StatusBadge} ${s[p.statusKey]}`}>
                                        {p.statusLabel}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />
        </div>
    )
}

export default AssistantDoctorPatients