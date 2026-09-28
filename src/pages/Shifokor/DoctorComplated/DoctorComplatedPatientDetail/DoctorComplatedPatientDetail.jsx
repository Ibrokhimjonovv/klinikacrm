import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './DoctorComplatedPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import Modal from '../../../../components/Modal/Modal';
import ImageZoomViewer from '../../../../components/shared/ImageZoomViewer/ImageZoomViewer';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const formatSum = (n) => Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm"

const doctorFullName = (doc) => {
    if (!doc) return ''
    return [doc.first_name, doc.last_name, doc.middle_name].filter(Boolean).join(' ')
}

const checkedByName = (entry) => {
    const detail = entry.checked_by_detail
    if (!detail) return null
    return detail.full_name || detail.username || null
}

const withOccurrenceInfo = (list, idFn) => {
    const totals = {}
        ; (list || []).forEach(entry => {
            const key = idFn(entry)
            totals[key] = (totals[key] || 0) + 1
        })

    const running = {}
    return (list || []).map(entry => {
        const key = idFn(entry)
        running[key] = (running[key] || 0) + 1
        return {
            entry,
            occurrenceIndex: running[key],
            occurrenceTotal: totals[key],
        }
    })
}

const isImageUrl = (url) => {
    if (!url) return false
    const clean = String(url).split('?')[0].toLowerCase()
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(clean)
}

const findMatchedService = (day, item) => {
    return (day.services || []).find(
        (sv) => sv.service === item.service || sv.service_detail?.id === item.service_detail?.id
    )
}

const DoctorComplatedPatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [treatmentHistory, setTreatmentHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyError, setHistoryError] = useState(null)

    const [modalOpen, setModalOpen] = useState(false)
    const [modalImage, setModalImage] = useState(null)

    const openImageModal = (url) => {
        setModalImage(url)
        setModalOpen(true)
    }
    const closeImageModal = () => {
        setModalOpen(false)
        setModalImage(null)
    }

    const [resultModal, setResultModal] = useState(null)

    const openResultModal = (matchedService) => {
        setResultModal({
            text: matchedService?.result_text || '',
            fileUrl: matchedService?.result_file_url || matchedService?.result_file || null,
        })
    }
    const closeResultModal = () => setResultModal(null)

    const fetchPatient = async () => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patientInfo/${id}/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setPatient(data)
        } catch (err) {
            console.error('API xatosi:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchTreatmentHistory = async () => {
        try {
            setHistoryLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patient/${id}/treatments/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setTreatmentHistory(
                (data.treatments || []).filter(plan => plan.is_end)
            )
        } catch (err) {
            console.error('Tarixni olishda xatolik:', err)
            setHistoryError(err.message)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        fetchPatient()
        fetchTreatmentHistory()
    }, [id])

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return null

    const renderItemMeta = (item) => {
        const hasMeta = item.text || item.service_detail?.price != null || item.service_detail?.duration_minutes != null
        if (!hasMeta) return null

        return (
            <div className={s.ItemMetaRow}>
                {item.text && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-chat-square-text"></i>
                        {item.text}
                    </span>
                )}
                {item.service_detail?.price != null && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-cash"></i>
                        {formatSum(item.service_detail.price)}
                    </span>
                )}
                {item.service_detail?.duration_minutes != null && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-hourglass-split"></i>
                        {item.service_detail.duration_minutes} daq.
                    </span>
                )}
            </div>
        )
    }

    const renderServiceResultTrigger = (matchedService) => {
        return (
            <button
                type="button"
                className={s.FileViewBtn}
                onClick={() => openResultModal(matchedService)}
            >
                <i className="bi bi-clipboard2-check"></i>
                <span>Natijani ko'rish</span>
            </button>
        )
    }

    const renderItemDisplay = (day, item, occurrenceIndex, occurrenceTotal) => {
        const checkedName = checkedByName(item)
        const showOccurrence = occurrenceTotal > 1

        const occurrenceBadge = showOccurrence && (
            <span className={s.OccurrenceBadge}>{occurrenceIndex}-marta</span>
        )

        const matchedService = findMatchedService(day, item)
        const hasFile = !!item.medical_media || !!item.file

        return (
            <div className={`${s.MediaCard} ${item.checked ? s.MediaCardDone : ''}`}>
                <div className={s.MediaCardTop}>
                    <div className={s.MediaCardIcon}>
                        <i
                            className={`bi ${item.checked
                                ? 'bi-check-circle-fill'
                                : 'bi-list-check'
                                }`}
                        ></i>
                    </div>

                    <div className={s.MediaCardText}>
                        <p className={s.MediaCardLabel}>
                            {occurrenceBadge}
                            {item.checked ? 'Bajarildi' : 'Bajarilmagan'}
                        </p>

                        <p className={s.MediaCardDesc}>
                            {item.service_detail?.name || 'Xizmat'}
                        </p>

                        {renderItemMeta(item)}
                    </div>
                </div>

                {item.dif && hasFile && (
                    <a
                        href={item.medical_media || item.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.MediaViewBtn}
                    >
                        <i className="bi bi-eye"></i> Media faylni ko'rish
                    </a>
                )}

                {renderServiceResultTrigger(matchedService)}

                <div
                    className={`${s.MediaCheckRow} ${s.MediaCheckRowStatic} ${item.checked ? s.MediaCheckRowChecked : ''}`}
                    title={
                        item.checked && checkedName
                            ? `${checkedName} tomonidan belgilangan`
                            : undefined
                    }
                >
                    <input type="checkbox" checked={!!item.checked} disabled readOnly />
                    <span>
                        {item.checked ? 'Bajarildi deb belgilangan' : 'Bajarilmagan'}
                    </span>
                    {item.checked && <i className="bi bi-check-lg"></i>}
                </div>
            </div>
        )
    }

    const renderMedicineDisplay = (med, occurrenceIndex, occurrenceTotal) => {
        const checkedName = checkedByName(med)
        const showOccurrence = occurrenceTotal > 1

        const occurrenceBadge = showOccurrence && (
            <span className={s.OccurrenceBadge}>{occurrenceIndex}-marta</span>
        )

        return (
            <div className={`${s.MediaCard} ${med.checked ? s.MediaCardDone : ''}`}>
                <div className={s.MediaCardTop}>
                    <div className={s.MediaCardIcon}>
                        <i className={`bi ${med.checked ? 'bi-check-circle-fill' : 'bi-capsule'}`}></i>
                    </div>

                    <div className={s.MediaCardText}>
                        <p className={s.MediaCardLabel}>
                            {occurrenceBadge}
                            {med.checked ? 'Berildi' : 'Berilmagan'}
                        </p>

                        <p className={s.MediaCardDesc}>
                            {med.medicine_detail?.name || 'Nomaʼlum dori'}
                        </p>

                        <div className={s.ItemMetaRow}>
                            <span className={s.ItemMetaTag}>
                                <i className="bi bi-box-seam"></i>
                                {med.quantity} dona
                            </span>
                            <span className={s.ItemMetaTag}>
                                <i className="bi bi-cash"></i>
                                {formatSum(med.unit_price)} / dona
                            </span>
                            <span className={s.ItemMetaTag}>
                                <i className="bi bi-calculator"></i>
                                Jami: {formatSum(med.total_price)}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className={`${s.MediaCheckRow} ${s.MediaCheckRowStatic} ${med.checked ? s.MediaCheckRowChecked : ''}`}
                    title={
                        med.checked && checkedName
                            ? `${checkedName} tomonidan belgilangan`
                            : undefined
                    }
                >
                    <input type="checkbox" checked={!!med.checked} disabled readOnly />
                    <span>
                        {med.checked ? 'Berildi deb belgilangan' : 'Berilmagan'}
                    </span>
                    {med.checked && <i className="bi bi-check-lg"></i>}
                </div>
            </div>
        )
    }

    const renderDayMedicines = (day) => {
        if (!day.medicines || day.medicines.length === 0) return null

        const medsWithOccurrence = withOccurrenceInfo(
            day.medicines,
            (m) => m.medicine ?? m.medicine_detail?.id
        )

        const dayNoteText = day.items?.find(it => it.text)?.text

        return (
            <div className={`${s.DayServicesBox} ${s.DayServicesBoxMed}`}>
                <p className={s.DayServicesTitle}>
                    <i className="bi bi-capsule"></i> Dorilar
                </p>

                {dayNoteText && (
                    <div className={s.ItemMetaRow}>
                        <span className={s.ItemMetaTag}>
                            <i className="bi bi-chat-square-text"></i>
                            {dayNoteText}
                        </span>
                    </div>
                )}

                <ul className={s.CheckList}>
                    {medsWithOccurrence.map(({ entry: med, occurrenceIndex, occurrenceTotal }) => (
                        <li key={med.id}>
                            {renderMedicineDisplay(med, occurrenceIndex, occurrenceTotal)}
                        </li>
                    ))}
                </ul>
            </div>
        )
    }

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate('/doctor-complated-patients')}>
                <i className="bi bi-arrow-left"></i> Bemorlar ro'yxatiga qaytish
            </button>

            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>{patient.first_name?.[0] || '?'}</div>
                    <div>
                        <h1>{patient.first_name} {patient.last_name} {patient.middle_name}</h1>
                        <p>{calcAge(patient.date_of_birth)} yosh · {patient.gender === 'erkak' ? 'Erkak' : 'Ayol'}</p>
                    </div>
                </div>
                <span className={s.StatusPill}>
                    <i className="bi bi-check-circle-fill"></i> Yakunlangan bemor
                </span>
            </div>

            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div><span>Telefon</span><p>{patient.contact_number}</p></div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-geo-alt"></i>
                    <div><span>Manzil</span><p>{patient.address}</p></div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Tug'ilgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient.date_of_birth} format='date' />
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-clock-history"></i>
                    <div>
                        <span>Ro'yxatdan o'tgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient.create_date} />
                    </div>
                </div>
            </div>

            <div className={s.PlansSection}>
                <h2>Yakunlangan davolash rejalari</h2>

                {historyLoading && <p className={s.Empty}>Yuklanmoqda...</p>}
                {historyError && (
                    <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {historyError}</p>
                )}

                {!historyLoading && treatmentHistory.length === 0 && (
                    <p className={s.Empty}>Bu bemor uchun yakunlangan davolash rejasi mavjud emas</p>
                )}

                <div className={s.PlansList}>
                    {treatmentHistory.map((plan) => {
                        const progress = Math.round(plan.progress ?? 0)
                        const doctor = plan.doctors?.[0]

                        const totalPrice = (plan.days || []).reduce(
                            (sum, day) => sum + (Number(day.price) || 0),
                            0
                        )

                        return (
                            <div key={plan.id} className={s.PlanCard}>

                                <div className={s.PlanCardHead}>
                                    <div className={s.PlanCardHeadLeft}>
                                        <div className={s.PlanTitleRow}>
                                            <h3>Shikoyat: {plan.patient?.complaint}</h3>
                                        </div>
                                        <br />
                                        <div className={s.PlanTitleRow}>
                                            <h3>Tashxis: {plan.diagnosis}</h3>
                                            <span className={`${s.PlanStatusBadge} ${s.done}`}>
                                                <i className="bi bi-check-circle-fill"></i> Yakunlangan
                                            </span>
                                        </div>

                                        {plan.complaint && (
                                            <p className={s.ComplaintLabel}>
                                                <i className="bi bi-chat-square-text"></i> {plan.complaint}
                                            </p>
                                        )}

                                        <div className={s.PlanMeta}>
                                            {doctor && (
                                                <span>
                                                    <i className="bi bi-person-badge"></i>
                                                    {doctorFullName(doctor)}
                                                </span>
                                            )}
                                            {plan.created_at && (
                                                <span>
                                                    <i className="bi bi-calendar-plus"></i>
                                                    Boshlangan: <DateTimeFormatter date={plan.created_at} format="date" />
                                                </span>
                                            )}
                                            {plan.completed_at && (
                                                <span>
                                                    <i className="bi bi-calendar-check"></i>
                                                    Yakunlangan: <DateTimeFormatter date={plan.completed_at} format="date" />
                                                </span>
                                            )}
                                            {totalPrice > 0 && (
                                                <span>
                                                    <i className="bi bi-receipt"></i>
                                                    Umumiy narx: <strong>{formatSum(totalPrice)}</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={s.PlanStats}>
                                        <div className={s.ProgressBarTrack}>
                                            <div
                                                className={s.ProgressBarFill}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className={s.ProgressPercent}>{progress}%</span>
                                    </div>
                                </div>

                                <div className={s.PlanDaysGrid}>
                                    {plan.days?.map((day, dayIndex) => {
                                        const itemsWithOccurrence = withOccurrenceInfo(
                                            day.items,
                                            (it) => it.service ?? it.service_detail?.id
                                        )

                                        const dayTime = day.items?.find(it => it.time)?.time

                                        return (
                                            <div key={day.id} className={s.PlanDayCard}>
                                                <div className={s.PlanDayCardHead}>
                                                    <span className={s.DayBadge}>{day.day_number || dayIndex + 1}-kun</span>
                                                    {day.price != null && (
                                                        <span className={s.DayPriceTag}>{formatSum(day.price)}</span>
                                                    )}
                                                </div>

                                                {day.items?.length > 0 && (
                                                    <div className={s.DayServicesBox}>
                                                        <div className={s.DayServicesTitleRow}>
                                                            <p className={s.DayServicesTitle}>
                                                                <i className="bi bi-list-check"></i> Xizmatlar
                                                            </p>
                                                            {dayTime && (
                                                                <span className={s.ItemMetaTag}>
                                                                    <i className="bi bi-clock"></i>
                                                                    {dayTime}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <ul className={s.CheckList}>
                                                            {itemsWithOccurrence.map(({ entry: item, occurrenceIndex, occurrenceTotal }) => (
                                                                <li key={item.id}>
                                                                    {renderItemDisplay(day, item, occurrenceIndex, occurrenceTotal)}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {renderDayMedicines(day)}

                                                {day.note && <p className={s.PlanDayNote}>{day.note}</p>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ✅ Natija (izoh + fayl ko'rish tugmasi) modali */}
            <Modal isOpen={!!resultModal} onClose={closeResultModal} side="right">
                {resultModal && (
                    <div className={s.ResultModalBox}>
                        <h2 className={s.ResultModalTitle}>
                            <i className="bi bi-clipboard2-check"></i> Natija
                        </h2>

                        {resultModal.text || resultModal.fileUrl ? (
                            <>
                                {resultModal.text ? (
                                    <p className={s.ResultModalText}>{resultModal.text}</p>
                                ) : (
                                    <p className={s.ResultModalText}>Izoh kiritilmagan</p>
                                )}

                                {resultModal.fileUrl && (
                                    <button
                                        type="button"
                                        className={s.FileViewBtn}
                                        onClick={() => {
                                            if (isImageUrl(resultModal.fileUrl)) {
                                                openImageModal(resultModal.fileUrl)
                                            } else {
                                                window.open(resultModal.fileUrl, '_blank', 'noopener,noreferrer')
                                            }
                                        }}
                                    >
                                        <i className={isImageUrl(resultModal.fileUrl) ? 'bi bi-image' : 'bi bi-file-earmark-pdf'}></i>
                                        <span>Faylni ko'rish</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className={s.ResultModalEmptyState}>
                                <i className="bi bi-inbox"></i>
                                <p>Bu xizmat bo'yicha hozircha natija biriktirilmagan</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ✅ Rasmni katta qilib ko'rsatuvchi modal */}
            <Modal isOpen={modalOpen} onClose={closeImageModal} fullWidth>
                {modalImage && (
                    <ImageZoomViewer src={modalImage} alt="Natija fayli" />
                )}
            </Modal>

        </div>
    )
}

export default DoctorComplatedPatientDetail