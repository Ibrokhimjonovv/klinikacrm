import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom"
import s from "./NurseHome.module.scss"
import Modal from '../../../components/Modal/Modal';
import PatientAdmission from '../../../components/XamshiraReseption/PatientAdmission/PatientAdmission';
import { useAppContext } from '../../../context/context';
import { api } from '../../../App';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';
// 🆕 CHEK PRINT FUNKSIYASI
import { printQueueTicket } from '../../../components/shared/QueueReceipt/QueueTicketReceipt';

const ResNurseHome = () => {
    const { user, patients: todayAdmissions, patientsLoading: loading, patientsError: error, fetchPatients } = useAppContext()
    const [showAdmission, setShowAdmission] = useState(false)

    const [queueLoading, setQueueLoading] = useState(false)
    const [queueRefreshLoading, setQueueRefreshLoading] = useState(false)
    const [queueInfo, setQueueInfo] = useState(null)

    const [confirmModal, setConfirmModal] = useState(false)
    const [resultModal, setResultModal] = useState(null)

    useEffect(() => {
        if (todayAdmissions.length === 0) {
            fetchPatients()
        }
    }, [])

    const handleCloseAdmission = () => {
        setShowAdmission(false)
        fetchPatients()
    }

    const getHeaders = () => {
        const token = localStorage.getItem('hospital_access')
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    }

    // ✅ NAVBAT OLISH + PRINTER CHEK
    const handleTakeQueue = async () => {
        try {
            setQueueLoading(true)

            const res = await fetch(`${api}/queue/take/`, {
                method: 'POST',
                headers: getHeaders(),
            })

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

            const data = await res.json()

            // 🖨 CHEK PRINTERGA
            printQueueTicket({
                number: data.number,
                date: data.date || new Date().toISOString(),
                issuedAt: data.created_at || new Date().toISOString(),
                clinicName: 'AOC CRM',
                operator: user?.doctor?.first_name || user?.nurse?.first_name || '',
            })

            await fetchQueueInfo()

            setResultModal({
                type: 'success',
                title: 'Navbat cheki chiqarildi',
                text: 'Chek printerdan chiqdi. Iltimos, uni bemorga bering.',
                number: data.number,
            })
        } catch (err) {
            console.error('Navbat olishda xatolik:', err)
            setResultModal({
                type: 'error',
                title: 'Xatolik yuz berdi',
                text: 'Navbat olishda xatolik. Iltimos, qaytadan urinib ko\'ring.',
            })
        } finally {
            setQueueLoading(false)
        }
    }


    // NAVBAT HOLATINI OLISH
    const fetchQueueInfo = async () => {
        try {
            const res = await fetch(`${api}/queue/today/`, {
                method: 'GET',
                headers: getHeaders(),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

            const data = await res.json()
            const tickets = Array.isArray(data) ? data : (data.results || [])
            const lastNumber = tickets.length > 0
                ? Math.max(...tickets.map(t => t.number))
                : 0

            setQueueInfo({
                lastNumber,
                total: tickets.length,
                date: new Date().toLocaleDateString(),
            })
            return { lastNumber, total: tickets.length }
        } catch (err) {
            console.error('Navbat holatini olishda xatolik:', err)
            throw err
        }
    }

    // 🔄 "NAVBATNI YANGILASH" bosilganda — avval tasdiq modali chiqadi
    const handleRefreshQueueClick = () => {
        setConfirmModal(true)
    }

    // Tasdiqdan keyin haqiqiy reset
    const confirmResetQueue = async () => {
        setConfirmModal(false)

        try {
            setQueueRefreshLoading(true)

            const res = await fetch(`${api}/queue/reset/`, {
                method: 'POST',
                headers: getHeaders(),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

            const data = await res.json()
            await fetchQueueInfo()

            setResultModal({
                type: 'success',
                title: 'Navbat noldan boshlandi',
                text: `${data.deleted ?? 0} ta yozuv o'chirildi. Keyingi navbat №1 dan boshlanadi.`,
            })
        } catch (err) {
            console.error('Navbatni noldan boshlashda xatolik:', err)
            setResultModal({
                type: 'error',
                title: 'Xatolik yuz berdi',
                text: 'Navbatni noldan boshlashda xatolik. Iltimos, qayta urinib ko\'ring.',
            })
        } finally {
            setQueueRefreshLoading(false)
        }
    }

    useEffect(() => {
        fetchQueueInfo().catch(() => {})
    }, [])

    const stats = [
        {
            title: 'Bugun qabul qilingan',
            value: todayAdmissions.length,
            icon: 'bi-person-check-fill',
            variant: 'orange'
        },
        {
            title: 'Navbatda kutmoqda',
            value: queueInfo ? queueInfo.total : todayAdmissions.filter(p => p.doctor === 'Kutilmoqda').length,
            icon: 'bi-hourglass-split',
            variant: 'blue'
        },
        {
            title: 'Shifokorga yuborilgan',
            value: todayAdmissions.filter(p => p.doctor !== 'Kutilmoqda').length,
            icon: 'bi-arrow-right-circle-fill',
            variant: 'green'
        },
    ]

    if (loading) {
        return (
            <section className={s.HomeContainer}>
                <div className={s.LoadingContainer}>
                    <i className="bi bi-arrow-repeat spin"></i>
                    <p>Ma'lumotlar yuklanmoqda...</p>
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className={s.HomeContainer}>
                <div className={s.ErrorContainer}>
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <p>Ma'lumotlarni yuklashda xatolik yuz berdi: {error}</p>
                    <button onClick={() => window.location.reload()}>Qayta urinish</button>
                </div>
            </section>
        )
    }

    return (
        <section className={s.HomeContainer}>

            <div className={s.TopRow}>
                <div>
                    <p className={s.Breadcrumb}>Bosh sahifa</p>
                    <p>Xush kelibsiz, <span>{user?.doctor?.first_name || 'Xodim'}</span></p>
                </div>

                <div className={s.TopActions}>
                    {/* 1. Navbat olish */}
                    <button
                        className={s.QueueBtn}
                        onClick={handleTakeQueue}
                        disabled={queueLoading}
                    >
                        {queueLoading ? (
                            <><i className="bi bi-arrow-repeat spin"></i> Yuklanmoqda...</>
                        ) : (
                            <><i className="bi bi-ticket-perforated"></i> Navbat olish</>
                        )}
                    </button>

                    {/* 2. Navbatni yangilash (noldan boshlash) */}
                    <button
                        className={s.RefreshQueueBtn}
                        onClick={handleRefreshQueueClick}
                        disabled={queueRefreshLoading}
                        title="Bugungi navbatni o'chirib, №1 dan qayta boshlash"
                    >
                        {queueRefreshLoading ? (
                            <><i className="bi bi-arrow-repeat spin"></i> Tozalanmoqda...</>
                        ) : (
                            <><i className="bi bi-arrow-clockwise"></i> Navbatni yangilash</>
                        )}
                    </button>

                    {/* 3. Bemor qabul qilish */}
                    <button
                        className={s.AddPatientBtn}
                        onClick={() => setShowAdmission(true)}
                    >
                        <i className="bi bi-plus-lg"></i> Bemor qabul qilish
                    </button>
                </div>
            </div>

            {/* Navbat holati paneli */}
            {queueInfo && (
                <div className={s.QueuePanel}>
                    <div className={s.QueueItem}>
                        <i className="bi bi-ticket-perforated-fill"></i>
                        <div>
                            <span>Oxirgi raqam</span>
                            <strong>№{queueInfo.lastNumber}</strong>
                        </div>
                    </div>
                    <div className={s.QueueItem}>
                        <i className="bi bi-people-fill"></i>
                        <div>
                            <span>Bugun olingan</span>
                            <strong>{queueInfo.total} ta</strong>
                        </div>
                    </div>
                    <div className={s.QueueItem}>
                        <i className="bi bi-calendar-event"></i>
                        <div>
                            <span>Sana</span>
                            <strong>{queueInfo.date}</strong>
                        </div>
                    </div>
                </div>
            )}

            <div className={s.StatsRow}>
                {stats.map((stat, i) => (
                    <div key={i} className={`${s.StatCard} ${s[`Variant_${stat.variant}`]}`}>
                        <div className={s.StatIcon}>
                            <i className={`bi ${stat.icon}`}></i>
                        </div>
                        <div>
                            <h2>{stat.value}</h2>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={s.ListCard}>
                <div className={s.ListHead}>
                    <div className={s.ListHeadLeft}>
                        <h3>Bugun ro'yxatga olingan bemorlar</h3>
                        <span className={s.CountBadge}>{todayAdmissions.length} ta</span>
                    </div>
                    <Link to="/nurse/patients/all-patients">Barchasini ko'rish</Link>
                </div>

                {todayAdmissions.length === 0 ? (
                    <p className={s.Empty}>Bugun hali hech kim qabul qilinmagan</p>
                ) : (
                    <ul>
                        {todayAdmissions.slice(0, 10).map((p) => (
                            <li key={p.id}>
                                <Link to={`/nurse/patients/patient/${p.id}`}>
                                    <div className={s.PatientLeft}>
                                        <div className={s.Avatar}>{p.name ? p.name[0] : '?'}</div>
                                        <div className={s.PatientInfo}>
                                            <p>{p.name}</p>
                                            <span className="truncate">{p.complaint}</span>
                                        </div>
                                    </div>
                                    <div className={s.PatientRight}>
                                        <DateTimeFormatter
                                            date={p.time}
                                            format="datetime"
                                            className={s.Time}
                                        />
                                        <span className={`${s.DoctorBadge}`}>
                                            {p.doctor_name} {p.doctor_surename}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* ===== Bemor qabul qilish modali ===== */}
            <Modal
                isOpen={showAdmission}
                onClose={handleCloseAdmission}
            >
                <PatientAdmission onSuccess={handleCloseAdmission} />
            </Modal>

            {/* ===== 🆕 Tasdiq modali ===== */}
            {confirmModal && (
                <div className={s.Overlay} onClick={() => setConfirmModal(false)}>
                    <div className={s.CustomModal} onClick={(e) => e.stopPropagation()}>
                        <div className={`${s.ModalIconWrap} ${s.WarnIcon}`}>
                            <i className="bi bi-exclamation-triangle-fill"></i>
                        </div>
                        <h3>Navbatni noldan boshlash</h3>
                        <p>
                            Rostdan ham bugungi navbatni noldan boshlamoqchimisiz?
                            <br />
                            <span className={s.ModalHint}>
                                Barcha bugungi navbat raqamlari o'chiriladi va keyingi navbat <b>№1</b> dan boshlanadi.
                            </span>
                        </p>
                        <div className={s.ModalActions}>
                            <button
                                className={s.CancelBtn}
                                onClick={() => setConfirmModal(false)}
                            >
                                Bekor qilish
                            </button>
                            <button
                                className={s.ConfirmBtn}
                                onClick={confirmResetQueue}
                            >
                                <i className="bi bi-arrow-clockwise"></i> Ha, noldan boshlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== 🆕 Natija modali ===== */}
            {resultModal && (
                <div className={s.Overlay} onClick={() => setResultModal(null)}>
                    <div className={s.CustomModal} onClick={(e) => e.stopPropagation()}>
                        <div className={`${s.ModalIconWrap} ${
                            resultModal.type === 'success' ? s.SuccessIcon
                            : resultModal.type === 'error' ? s.ErrorIcon
                            : s.InfoIcon
                        }`}>
                            <i className={`bi ${
                                resultModal.type === 'success' ? 'bi-check-circle-fill'
                                : resultModal.type === 'error' ? 'bi-x-circle-fill'
                                : 'bi-info-circle-fill'
                            }`}></i>
                        </div>

                        <h3>{resultModal.title}</h3>

                        {/* Agar navbat raqami bo'lsa — katta raqam ko'rsatamiz */}
                        {resultModal.number != null && (
                            <div className={s.BigNumberWrap}>
                                <span className={s.BigNumberLabel}>Sizning navbatingiz</span>
                                <div className={s.BigNumber}>№{resultModal.number}</div>
                            </div>
                        )}

                        <p>{resultModal.text}</p>

                        <div className={s.ModalActions}>
                            <button
                                className={s.ConfirmBtn}
                                onClick={() => setResultModal(null)}
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

export default ResNurseHome
