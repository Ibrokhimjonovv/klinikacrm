import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './DoctorProgressPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../../context/context';
import Modal from '../../../../components/Modal/Modal';

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

const getPlanStatus = (plan) => {
    const progress = plan.progress ?? 0

    if (plan.is_end || plan.completed_at || progress >= 100) {
        return { label: 'Yakunlandi', className: 'done' }
    }

    if (plan.started_at || progress > 0) {
        return { label: 'Jarayonda', className: 'active' }
    }

    return { label: 'Boshlanmagan', className: 'watch' }
}

// ✅ "doctor" obyektidan (first_name/middle_name/last_name) to'liq
// ism yasaydi. Bu faqat plan.created_by.doctor kabi NASTED
// obyektlar uchun ishlatiladi. checked_by_detail uchun EMAS —
// u backend'da allaqachon tayyor "full_name" bilan keladi.
const doctorFullName = (doc) => {
    if (!doc) return ''
    return [doc.first_name, doc.last_name, doc.middle_name].filter(Boolean).join(' ')
}

// ✅ item.checked_by — bu shunchaki ID raqami (masalan 4), obyekt
// EMAS. Kim belgilagani haqidagi to'liq ma'lumot (username, role,
// tayyor full_name) faqat item.checked_by_detail ichida keladi.
// Shu sabab bu yordamchi funksiya checked_by_detail'dan foydalanadi.
const checkedByName = (item) => {
    const detail = item.checked_by_detail
    if (!detail) return null
    return detail.full_name || detail.username || null
}

const DoctorProgressPatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { fetchDoctorCounts } = useAppContext()

    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [treatmentHistory, setTreatmentHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyError, setHistoryError] = useState(null)
    const [togglingItemId, setTogglingItemId] = useState(null)
    const [uploadingItemId, setUploadingItemId] = useState(null)
    const [uploadError, setUploadError] = useState(null)

    const [selectedMedia, setSelectedMedia] = useState(null)

    const [mediaGallery, setMediaGallery] = useState(null)

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

    const fetchTreatmentHistory = async (silent = false) => {
        try {
            if (!silent) setHistoryLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/patient/${id}/treatments/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            setTreatmentHistory(
                (data.treatments || []).filter(plan => !plan.is_end)
            )
        } catch (err) {
            console.error('Tarixni olishda xatolik:', err)
            if (!silent) setHistoryError(err.message)
        } finally {
            if (!silent) setHistoryLoading(false)
        }
    }

    useEffect(() => {
        fetchPatient()
        fetchTreatmentHistory()
    }, [id])


    const handleToggleItem = async (planId, dayId, item) => {
        const newChecked = !item.checked
        setTogglingItemId(item.id)

        setTreatmentHistory(prev => prev.map(plan =>
            plan.id !== planId ? plan : {
                ...plan,
                days: plan.days.map(d =>
                    d.id !== dayId ? d : {
                        ...d,
                        items: d.items.map(it => it.id === item.id ? { ...it, checked: newChecked } : it)
                    }
                )
            }
        ))

        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/treatmentItem/${item.id}/check/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ checked: newChecked }),
            })
            if (!res.ok) throw new Error('check failed')

            const data = await res.json()
            if (data?.data) {
                setTreatmentHistory(prev => prev.map(plan =>
                    plan.id !== planId ? plan : {
                        ...plan,
                        days: plan.days.map(d =>
                            d.id !== dayId ? d : {
                                ...d,
                                items: d.items.map(it => it.id === item.id ? { ...it, ...data.data } : it)
                            }
                        )
                    }
                ))
            }

            fetchTreatmentHistory(true)

        } catch (err) {
            console.error('Belgilashda xatolik:', err)
            setTreatmentHistory(prev => prev.map(plan =>
                plan.id !== planId ? plan : {
                    ...plan,
                    days: plan.days.map(d =>
                        d.id !== dayId ? d : {
                            ...d,
                            items: d.items.map(it => it.id === item.id ? { ...it, checked: !newChecked } : it)
                        }
                    )
                }
            ))
        } finally {
            setTogglingItemId(null)
        }
    }

    const handleUploadMediaFile = async (planId, dayId, item, file) => {
        if (!file) return

        setUploadingItemId(item.id)
        setUploadError(null)

        try {
            const token = localStorage.getItem('hospital_access')
            const body = new FormData()
            body.append('medical_media', file)

            const res = await fetch(`${api}/treatmentItem/${item.id}/upload/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body,
            })

            if (!res.ok) throw new Error('upload failed')

            const data = await res.json()

            setTreatmentHistory(prev => prev.map(plan =>
                plan.id !== planId ? plan : {
                    ...plan,
                    days: plan.days.map(d =>
                        d.id !== dayId ? d : {
                            ...d,
                            items: d.items.map(it => it.id === item.id
                                ? { ...it, ...(data?.data || data), file_url: data?.data?.file_url || data?.file_url || it.file_url }
                                : it
                            )
                        }
                    )
                }
            ))

        } catch (err) {
            console.error('Fayl yuklashda xatolik:', err)
            setUploadError("Faylni yuklashda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setUploadingItemId(null)
        }
    }

    const [endingPlanId, setEndingPlanId] = useState(null)
    const [confirmEndPlan, setConfirmEndPlan] = useState(null)

    const openEndPlanConfirm = (plan) => {
        setConfirmEndPlan({
            id: plan.id,
            diagnosis: plan.diagnosis,
            progress: Math.round(plan.progress ?? 0),
        })
    }

    const confirmEndPlanAction = async () => {
        if (!confirmEndPlan) return
        const planId = confirmEndPlan.id

        setEndingPlanId(planId)
        setConfirmEndPlan(null)

        try {
            const token = localStorage.getItem('hospital_access')

            const res = await fetch(`${api}/donePatient/${planId}/`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    is_end: true,
                }),
            })

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            setTreatmentHistory(prev =>
                prev.filter(plan => plan.id !== planId)
            )

            fetchDoctorCounts()

        } catch (err) {
            console.error('Rejani yakunlashda xatolik:', err)
        } finally {
            setEndingPlanId(null)
        }
    }

    const isPdf = selectedMedia?.toLowerCase().includes('.pdf')

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return null

    // ------------------------------------------------------------
    // ✅ Bandning "xizmat / vaqt / narx" belgilarini ko'rsatadi.
    // API endi har bir item bilan birga service_detail (nomi,
    // narxi, davomiyligi) va time (vaqt) qaytaradi.
    // ------------------------------------------------------------
    const renderItemMeta = (item) => {
        const hasMeta = item.service_detail?.name || item.time || item.service_detail?.price
        if (!hasMeta) return null

        return (
            <div className={s.ItemMetaRow}>
                {item.service_detail?.name && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-clipboard2-pulse"></i>
                        {item.service_detail.name}
                    </span>
                )}
                {item.time && (
                    <span className={s.ItemMetaTag}>
                        <i className="bi bi-clock"></i>
                        {item.time}
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

    const renderItemDisplay = (plan, day, item) => {
        const checkedName = checkedByName(item)

        if (item.dif) {
            const isUploading = uploadingItemId === item.id
            const hasFile = !!item.medical_media || !!item.file

            return (
                <div className={`${s.MediaCard} ${hasFile ? s.MediaCardDone : ''}`}>
                    <div className={s.MediaCardTop}>
                        <div className={s.MediaCardIcon}>
                            <i className={`bi ${hasFile ? 'bi-check-circle-fill' : 'bi-image'}`}></i>
                        </div>
                        <div className={s.MediaCardText}>
                            <p className={s.MediaCardLabel}>
                                {hasFile ? 'Fayl yuklandi' : 'Media kutilmoqda'}
                            </p>
                            <p className={s.MediaCardDesc}>{item.text}</p>
                            {renderItemMeta(item)}
                        </div>
                    </div>

                    <div className={s.MediaCardActions}>
                        <label className={`${s.MediaUploadBtn} ${isUploading ? s.MediaUploadBtnDisabled : ''} ${hasFile ? s.MediaUploadBtnSecondary : ''}`}>
                            <input
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                disabled={isUploading}
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleUploadMediaFile(plan.id, day.id, item, file)
                                    e.target.value = ''
                                }}
                            />
                            {isUploading ? (
                                <>
                                    <i className="bi bi-arrow-repeat"></i>
                                    Yuklanmoqda...
                                </>
                            ) : hasFile ? (
                                <>
                                    <i className="bi bi-arrow-repeat"></i>
                                    Almashtirish
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-upload"></i>
                                    Fayl tanlash
                                </>
                            )}
                        </label>

                        {hasFile && (
                            <a
                                href={item.medical_media || item.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={s.MediaViewBtn}
                            >
                                <i className="bi bi-eye"></i> Ko'rish
                            </a>
                        )}
                    </div>

                    <label
                        className={`${s.MediaCheckRow} ${!hasFile ? s.MediaCheckRowDisabled : ''} ${item.checked ? s.MediaCheckRowChecked : ''}`}
                        title={
                            !hasFile
                                ? "Avval fayl yuklang"
                                : (item.checked && checkedName
                                    ? `${checkedName} tomonidan belgilangan`
                                    : undefined)
                        }
                    >
                        <input
                            type="checkbox"
                            checked={!!item.checked}
                            disabled={!hasFile || togglingItemId === item.id}
                            onChange={() => handleToggleItem(plan.id, day.id, item)}
                        />
                        <span>
                            {item.checked ? 'Bajarildi deb belgilangan' : 'Bajarildi deb belgilash'}
                        </span>
                        {item.checked && <i className="bi bi-check-lg"></i>}
                    </label>
                </div>
            )
        }

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
                            {item.checked
                                ? 'Bajarildi'
                                : 'Bajarilishi kutilmoqda'}
                        </p>

                        <p className={s.MediaCardDesc}>
                            {item.text}
                        </p>

                        {renderItemMeta(item)}
                    </div>
                </div>

                <label
                    className={`${s.MediaCheckRow} ${item.checked
                        ? s.MediaCheckRowChecked
                        : ''
                        }`}
                    title={
                        item.checked && checkedName
                            ? `${checkedName} tomonidan belgilangan`
                            : undefined
                    }
                >
                    <input
                        type="checkbox"
                        checked={!!item.checked}
                        disabled={togglingItemId === item.id}
                        onChange={() =>
                            handleToggleItem(
                                plan.id,
                                day.id,
                                item
                            )
                        }
                    />

                    <span>
                        {item.checked
                            ? 'Bajarildi deb belgilangan'
                            : 'Bajarildi deb belgilash'}
                    </span>

                    {item.checked && (
                        <i className="bi bi-check-lg"></i>
                    )}
                </label>
            </div>
        )
    }

    // ------------------------------------------------------------
    // ✅ YANGI: kunlik dorilar ro'yxati. Backend TreatmentPlanDay
    // uchun "medicines" massivini alohida qaytaradi (item ichida
    // emas), shu sabab uni items ro'yxatidan keyin alohida
    // ko'rsatamiz.
    // ------------------------------------------------------------
    const renderDayMedicines = (day) => {
        if (!day.medicines || day.medicines.length === 0) return null

        return (
            <div className={s.DayMedicinesBox}>
                <p className={s.DayMedicinesTitle}>
                    <i className="bi bi-capsule"></i> Dorilar
                </p>
                <ul className={s.DayMedicinesList}>
                    {day.medicines.map((med) => (
                        <li key={med.id}>
                            <span className={s.DayMedicineName}>
                                {med.medicine_name || 'Nomaʼlum dori'}
                            </span>
                            <span className={s.DayMedicineCalc}>
                                {med.quantity} dona × {formatSum(med.unit_price)} = {formatSum(med.total_price)}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate('/doctor-progress-patients')}>
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
                    Jarayondagi bemor
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

            {uploadError && (
                <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {uploadError}</p>
            )}

            <div className={s.PlansSection}>
                <h2>Tashxis va davolash jarayoni</h2>

                {historyLoading && <p className={s.Empty}>Yuklanmoqda...</p>}
                {historyError && (
                    <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {historyError}</p>
                )}

                {!historyLoading && treatmentHistory.length === 0 && (
                    <p className={s.Empty}>Bu bemor uchun hozircha tashxis qo'yilmagan</p>
                )}

                <div className={s.PlansList}>
                    {treatmentHistory.map((plan) => {
                        const statusInfo = getPlanStatus(plan)
                        const progress = Math.round(plan.progress ?? 0)
                        // ✅ Reja qaysi shifokor tomonidan yaratilgani —
                        // plan.created_by.doctor NASTED obyekt, shu
                        // sabab bu yerda doctorFullName ishlatiladi
                        // (checked_by_detail'dan farqli o'laroq).
                        const createdByName =
                            doctorFullName(plan.created_by?.doctor) ||
                            plan.created_by?.username ||
                            null

                        return (
                            <div key={plan.id} className={s.PlanCard}>

                                <div className={s.PlanCardHead}>
                                    <div className={s.PlanCardHeadLeft}>
                                        <div className={s.PlanTitleRow}>
                                            <h3>{plan.diagnosis}</h3>
                                        </div>

                                        <div className={s.PlanMeta}>

                                            <div className={s.crreatt}>
                                                <span className={`${s.PlanStatusBadge} ${s[statusInfo.className]}`}>
                                                    {statusInfo.label}
                                                </span>

                                                {plan.media?.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className={s.DiagnosisMediaBtn}
                                                        onClick={() => setMediaGallery({ diagnosis: plan.diagnosis, items: plan.media })}
                                                    >
                                                        <i className="bi bi-paperclip"></i>
                                                        {plan.media.length} ta fayl
                                                    </button>
                                                )}

                                                {plan.complaint && (
                                                    <p className={s.ComplaintLabel}>
                                                        <i className="bi bi-chat-square-text"></i> {plan.complaint}
                                                    </p>
                                                )}

                                                {createdByName && (
                                                    <span>
                                                        <i className="bi bi-person-badge"></i>
                                                        Shifokor: {createdByName}
                                                    </span>
                                                )}

                                                {plan.created_at && (
                                                    <span>
                                                        <i className="bi bi-calendar-plus"></i>
                                                        Boshlangan: <DateTimeFormatter date={plan.created_at} format="date" />
                                                    </span>
                                                )}
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
                                    </div>

                                </div>

                                <div className={s.PlanDaysGrid}>
                                    {plan.days?.map((day, dayIndex) => (
                                        <div key={day.id} className={s.PlanDayCard}>
                                            <span className={s.DayBadge}>{day.day_number || dayIndex + 1}-kun</span>

                                            <ul className={s.CheckList}>
                                                {day.items?.map((item) => (
                                                    <li key={item.id}>
                                                        {renderItemDisplay(plan, day, item)}
                                                    </li>
                                                ))}
                                            </ul>

                                            {renderDayMedicines(day)}

                                            {day.note && <p className={s.PlanDayNote}>{day.note}</p>}
                                        </div>
                                    ))}
                                </div>

                                <div className={s.PlanActions}>
                                    {!plan.is_end ? (
                                        <button
                                            type="button"
                                            className={s.EndPlanBtn}
                                            onClick={() => openEndPlanConfirm(plan)}
                                            disabled={endingPlanId === plan.id}
                                        >
                                            {endingPlanId === plan.id ? (
                                                <>
                                                    <i className="bi bi-arrow-repeat"></i>
                                                    Yakunlanmoqda...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-circle"></i>
                                                    Rejani yakunlash
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className={s.EndedPlan}>
                                            <i className="bi bi-check-circle-fill"></i>
                                            Reja yakunlangan
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Modal isOpen={!!confirmEndPlan} onClose={() => setConfirmEndPlan(null)}>
                {confirmEndPlan && (
                    <div className={s.EndConfirmBox}>
                        <div className={`${s.EndConfirmIcon} ${confirmEndPlan.progress < 100 ? s.Warning : s.Success}`}>
                            <i className={`bi ${confirmEndPlan.progress < 100 ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'}`}></i>
                        </div>

                        {confirmEndPlan.progress < 100 ? (
                            <>
                                <h2>Muolaja to'liq tugatilmagan</h2>
                                <p>
                                    <strong>{confirmEndPlan.diagnosis}</strong> tashxisi bo'yicha davolash rejasi
                                    hozircha faqat <strong>{confirmEndPlan.progress}%</strong> bajarilgan.
                                </p>
                                <p className={s.EndConfirmSub}>
                                    Baribir yakunlashni istaysizmi? Bu amalni qaytarib bo'lmaydi.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2>Davolash rejasini yakunlash</h2>
                                <p>
                                    <strong>{confirmEndPlan.diagnosis}</strong> tashxisi bo'yicha davolash rejasi
                                    to'liq (<strong>100%</strong>) bajarilgan.
                                </p>
                                <p className={s.EndConfirmSub}>
                                    Rejani yakunlaganingizni tasdiqlaysizmi?
                                </p>
                            </>
                        )}

                        <div className={s.EndConfirmButtons}>
                            <button
                                type="button"
                                className={s.CancelBtn}
                                onClick={() => setConfirmEndPlan(null)}
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                className={confirmEndPlan.progress < 100 ? s.ConfirmWarningBtn : s.ConfirmSuccessBtn}
                                onClick={confirmEndPlanAction}
                            >
                                <i className="bi bi-check-lg"></i>
                                {confirmEndPlan.progress < 100 ? 'Baribir yakunlash' : 'Yakunlash'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!mediaGallery} onClose={() => setMediaGallery(null)}>
                {mediaGallery && (
                    <div className={s.GalleryBox}>
                        {/* <div className={s.GalleryHead}>
                            <h2>Tashxis fayllari</h2>
                            <p>{mediaGallery.diagnosis}</p>
                        </div> */}

                        <div className={s.GalleryGrid}>
                            {mediaGallery.items.map((m) => {
                                const url = m.url || m.file
                                const isPdfFile = url?.toLowerCase().includes('.pdf')

                                return (
                                    <a
                                        key={m.id}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={s.GalleryItem}
                                    >
                                        <div className={s.GalleryThumb}>
                                            {isPdfFile ? (
                                                <i className="bi bi-file-earmark-pdf"></i>
                                            ) : (
                                                <img src={url} alt={m.text || 'Fayl'} />
                                            )}
                                        </div>
                                        <p className={s.GalleryCaption}>{m.text || 'Fayl'}</p>
                                        <span className={s.GalleryOpenHint}>
                                            <i className="bi bi-box-arrow-up-right"></i> Ochish
                                        </span>
                                    </a>
                                )
                            })}
                        </div>
                    </div>
                )
                }
            </Modal >

        </div >
    )
}

export default DoctorProgressPatientDetail