import React, { useEffect, useState } from 'react';
import s from "./NurseInpatients.module.scss"
import { useNavigate } from 'react-router-dom'
import { api } from '../../../App';

import Pagination from '../../../components/shared/Pagination/Pagination';
import usePagination from '../../../components/shared/Pagination/usePagination';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

// ✅ TUZATILDI: endi bemor bo'yicha emas, HAR BIR REJA (treatment_plan_id)
// bo'yicha guruhlaymiz — assistant doktordagi kabi, bitta bemorga 2 ta
// reja biriktirilgan bo'lsa, ro'yxatda 2 ta alohida qator chiqadi.
const groupByPlan = (waiting, inProgress, completed) => {
    const all = [
        ...waiting.map(i => ({ ...i, _bucket: 'WAITING' })),
        ...inProgress.map(i => ({ ...i, _bucket: 'IN_PROGRESS' })),
        ...completed.map(i => ({ ...i, _bucket: 'DONE' })),
    ]

    const map = new Map()

    for (const item of all) {
        const patient = item.patient || {}
        const planId = item.treatment_plan_id
        const key = planId

        if (!map.has(key)) {
            map.set(key, {
                planId,
                patientId: patient.id,
                first_name: patient.first_name || '',
                last_name: patient.last_name || '',
                middle_name: patient.middle_name || '',
                birth_date: patient.date_of_birth || null,
                gender: patient.gender || '',
                phone: patient.contact_number || '—',
                doctors: new Map(),
                items: [],
                waitingCount: 0,
                progressCount: 0,
                doneCount: 0,
                diagnosis:
                    item.diagnosis ||
                    item.plan?.diagnosis ||
                    item.treatment_plan?.diagnosis ||
                    item.treatment_plan_diagnosis ||
                    null,
            })
        }

        const entry = map.get(key)
        entry.items.push(item)

        // ✅ Kun obyektida `status` yo'q — kun holatini qaysi ro'yxatdan kelganiga qarab olamiz
        if (item._bucket === 'WAITING') entry.waitingCount++
        else if (item._bucket === 'IN_PROGRESS') entry.progressCount++
        else if (item._bucket === 'DONE') entry.doneCount++

        for (const doc of item.doctors || []) {
            entry.doctors.set(doc.id, `${doc.first_name || ''} ${doc.last_name || ''}`.trim())
        }
    }

    return Array.from(map.values()).map(entry => {
        let statusKey = 'pending'
        let statusLabel = 'Kutilmoqda'

        if (entry.progressCount > 0) {
            statusKey = 'progress'
            statusLabel = 'Jarayonda'
        } else if (entry.waitingCount === 0 && entry.doneCount > 0) {
            statusKey = 'done'
            statusLabel = 'Yakunlangan'
        }

        return {
            ...entry,
            items: entry.items.sort((a, b) => a.day_number - b.day_number),
            doctorsLabel: Array.from(entry.doctors.values()).join(', ') || "Ko'rsatilmagan",
            totalDays: entry.items.length,
            statusKey,
            statusLabel,
        }
    })
}

const NurseInpatients = () => {
    const navigate = useNavigate()
    const [view, setView] = useState('table') // 'table' | 'card'
    const [search, setSearch] = useState('')

    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const controller = new AbortController()

        const fetchTreatments = async () => {
            try {
                setLoading(true)
                setError(null)
                const token = localStorage.getItem('hospital_access')
                const res = await fetch(`${api}/nurse/treatments/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal,
                })

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

                const data = await res.json()
                const grouped = groupByPlan(data.waiting || [], data.in_progress || [], data.completed || [])
                setPlans(grouped)
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('API xatosi:', err)
                    setError(err.message)
                }
            } finally {
                setLoading(false)
            }
        }

        fetchTreatments()
        return () => controller.abort()
    }, [])

    const filtered = plans.filter(p => {
        const fullName = `${p.first_name} ${p.last_name} ${p.middle_name}`.toLowerCase()
        return fullName.includes(search.toLowerCase())
    })

    const {
        pageItems,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
    } = usePagination(filtered, 100)

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
                    <h1>Yotib davolanayotgan bemorlar</h1>
                    <p>Sizga biriktirilgan bemorlar va muolajalar ro'yxati</p>
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
                                <th>Kunlar</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map(p => (
                                <tr key={p.planId} onClick={() => navigate(`/nurse/inpatient/${p.planId}`)}>
                                    <td>
                                        <div className={s.NameCell}>
                                            <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                            <div>
                                                <span>{p.first_name} {p.last_name}</span>
                                                {p.diagnosis && (
                                                    <p className={s.NameCellSub}>{p.diagnosis}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{calcAge(p.birth_date)} yosh</td>
                                    <td>{p.phone}</td>
                                    <td>{p.doneCount}/{p.totalDays} bajarilgan</td>
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
                    {pageItems.map(p => (
                        <div
                            key={p.planId}
                            className={s.PatientCard}
                            onClick={() => navigate(`/nurse/inpatient/${p.planId}`)}
                        >
                            <div className={s.CardTop}>
                                <div className={s.Avatar}>{p.first_name ? p.first_name[0] : '?'}</div>
                                <span className={`${s.StatusBadge} ${s[p.statusKey]}`}>
                                    {p.statusLabel}
                                </span>
                            </div>
                            <h3>{p.first_name} {p.last_name}</h3>
                            <p className={s.CardAge}>{calcAge(p.birth_date)} yosh · {p.gender === 'erkak' ? 'Erkak' : 'Ayol'}</p>
                            {p.diagnosis && (
                                <p className={s.NameCellSub}>{p.diagnosis}</p>
                            )}
                            <div className={s.CardInfo}>
                                <span><i className="bi bi-calendar2-week"></i> {p.doneCount}/{p.totalDays} kun bajarilgan</span>
                                <span><i className="bi bi-telephone"></i> {p.phone}</span>
                                <span><i className="bi bi-person-badge"></i> {p.doctorsLabel}</span>
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

export default NurseInpatients