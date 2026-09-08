import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './DoctorWaitingPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../../context/context';

const calcAge = (birthDate) => {
    if (!birthDate) return '?'
    const diff = Date.now() - new Date(birthDate).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

const STATUS_LABELS = {
    WAITING: 'Kutilmoqda',
    IN_PROGRESS: 'Jarayonda',
    COMPLETED: 'Yakunlangan',
    CANCELLED: 'Bekor qilingan',
}

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
})

const makeEmptyItem = (nextId) => ({ id: nextId(), type: 'text', text: '' })
const makeEmptyMedia = (nextId) => ({ id: nextId(), file: null, media_text: '' })

const DoctorWaitingPatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { fetchDoctorCounts } = useAppContext()
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const idCounter = useRef(0)
    const nextId = () => (idCounter.current += 1)

    const [selectedComplaintId, setSelectedComplaintId] = useState(null)
    const [planDiagnosis, setPlanDiagnosis] = useState('')

    // ---- Tashxisga tegishli media + izoh (kunlik rejadan mustaqil) ----
    const [planMedia, setPlanMedia] = useState([])

    const [planMode, setPlanMode] = useState('same')

    const [sameDayCount, setSameDayCount] = useState(1)
    const [sameItems, setSameItems] = useState([makeEmptyItem(nextId)])
    const [sameNote, setSameNote] = useState('')

    const [planDays, setPlanDays] = useState([])

    const [planSaving, setPlanSaving] = useState(false)
    const [planError, setPlanError] = useState('')
    const [planSuccess, setPlanSuccess] = useState(false)

    const fetchPatient = async () => {
        try {
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/dpatientInfo/${id}/`, {
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

    useEffect(() => {
        fetchPatient()
    }, [id])

    const selectedComplaint = patient?.complaints?.find(c => c.id === selectedComplaintId) || null

    const resetPlanState = () => {
        setPlanDiagnosis('')
        setPlanMedia([])
        setPlanMode('same')
        setSameDayCount(1)
        setSameItems([makeEmptyItem(nextId)])
        setSameNote('')
        setPlanDays([{ id: nextId(), items: [makeEmptyItem(nextId)], note: '' }])
        setPlanError('')
        setPlanSuccess(false)
    }

    const handleSelectComplaint = (complaint) => {
        if (selectedComplaintId === complaint.id) {
            setSelectedComplaintId(null)
            return
        }
        setSelectedComplaintId(complaint.id)
        resetPlanState()
    }

    // ---- Tashxis media handlerlari ----
    const addPlanMedia = () => setPlanMedia(prev => [...prev, makeEmptyMedia(nextId)])
    const removePlanMedia = (mediaId) => setPlanMedia(prev => prev.filter(m => m.id !== mediaId))
    const updatePlanMediaText = (mediaId, text) =>
        setPlanMedia(prev => prev.map(m => m.id === mediaId ? { ...m, media_text: text.slice(0, 50) } : m))
    const updatePlanMediaFile = (mediaId, file) =>
        setPlanMedia(prev => prev.map(m => m.id === mediaId ? { ...m, file } : m))

    // ---- "Bir xil" rejimi ----
    const addSameItem = () => setSameItems(prev => [...prev, makeEmptyItem(nextId)])
    const removeSameItem = (itemId) => setSameItems(prev => prev.filter(it => it.id !== itemId))
    const updateSameItemText = (itemId, text) =>
        setSameItems(prev => prev.map(it => it.id === itemId ? { ...it, text } : it))
    const updateSameItemType = (itemId, type) =>
        setSameItems(prev => prev.map(it => it.id === itemId ? { ...it, type, text: '' } : it))

    // ---- "Alohida" rejimi ----
    const addDay = () => setPlanDays(prev => [...prev, { id: nextId(), items: [makeEmptyItem(nextId)], note: '' }])
    const removeDay = (dayId) => setPlanDays(prev => prev.filter(d => d.id !== dayId))
    const addItem = (dayId) => setPlanDays(prev => prev.map(d =>
        d.id === dayId ? { ...d, items: [...d.items, makeEmptyItem(nextId)] } : d
    ))
    const removeItem = (dayId, itemId) => setPlanDays(prev => prev.map(d =>
        d.id === dayId ? { ...d, items: d.items.filter(it => it.id !== itemId) } : d
    ))
    const updateItemText = (dayId, itemId, text) => setPlanDays(prev => prev.map(d =>
        d.id === dayId
            ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, text } : it) }
            : d
    ))
    const updateItemType = (dayId, itemId, type) => setPlanDays(prev => prev.map(d =>
        d.id === dayId
            ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, type, text: '' } : it) }
            : d
    ))
    const updateDayNote = (dayId, note) => setPlanDays(prev => prev.map(d => d.id === dayId ? { ...d, note } : d))

    const isItemFilled = (item) => !!item.text.trim()

    const handleSubmitPlan = async (e) => {
        e.preventDefault()
        setPlanError('')
        setPlanSuccess(false)

        if (!selectedComplaint) {
            setPlanError("Avval shikoyatni tanlang")
            return
        }
        if (!planDiagnosis.trim()) {
            setPlanError("Tashxis nomi kiritilishi shart")
            return
        }

        const filledMedia = planMedia.filter(m => m.file && m.media_text.trim())
        const incompleteMedia = planMedia.some(m => (m.file && !m.media_text.trim()) || (!m.file && m.media_text.trim()))
        if (incompleteMedia) {
            setPlanError("Har bir media band uchun fayl va izoh birga to'ldirilishi shart")
            return
        }

        let daysPayload = []

        if (planMode === 'same') {
            const count = Number(sameDayCount)
            if (!count || count < 1) {
                setPlanError("Kunlar soni to'g'ri kiritilishi shart")
                return
            }
            const filledItems = sameItems.filter(isItemFilled)
            if (filledItems.length === 0) {
                setPlanError("Kamida 1 ta band (dori/muolaja) kiritilishi shart")
                return
            }
            daysPayload = Array.from({ length: count }, (_, i) => ({
                day_number: i + 1,
                note: sameNote,
                items: filledItems.map(it => ({
                    type: it.type,
                    text: it.text,
                    dif: it.type === 'media',
                })),
            }))
        } else {
            if (planDays.length === 0) {
                setPlanError("Kamida 1 kun qo'shilishi shart")
                return
            }
            const hasEmptyDay = planDays.some(d => d.items.every(it => !isItemFilled(it)))
            if (hasEmptyDay) {
                setPlanError("Har bir kunda kamida 1 ta band bo'lishi shart")
                return
            }
            daysPayload = planDays.map((d, index) => ({
                day_number: index + 1,
                note: d.note,
                items: d.items.filter(isItemFilled).map(it => ({
                    type: it.type,
                    text: it.text,
                    dif: it.type === 'media',
                })),
            }))
        }

        setPlanSaving(true)
        setPlanSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')

            // 1-BOSQICH: reja JSON sifatida yuboriladi
            const payload = {
                complaint: selectedComplaint.id,
                diagnosis: planDiagnosis,
                days: daysPayload,
            }

            const res = await fetch(`${api}/treatmentPlan/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
            const data = await res.json()

            if (!res.ok) {
                setPlanError(data?.message || data?.detail || data?.error?.complaint?.[0] || "Saqlashda xatolik yuz berdi")
                return
            }

            const planId = data?.id || data?.data?.id

            // 2-BOSQICH: barcha media fayllar BITTA so'rov orqali yuboriladi
            if (planId && filledMedia.length > 0) {
                const mediaBody = new FormData()
                filledMedia.forEach((m) => {
                    mediaBody.append('media', m.file)
                    mediaBody.append('media_text', m.media_text)
                })

                // console.log(`Media: ${m.file}\n Media text: ${m.media_text}`);
                

                const mediaRes = await fetch(`${api}/mediaTreatmentUpload/${planId}/`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: mediaBody,
                })

                if (!mediaRes.ok) {
                    console.error('Media yuklashda xatolik:', await mediaRes.text())
                }
            }

            setPlanSuccess(true)
            fetchDoctorCounts()

        } catch (err) {
            setPlanError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
        } finally {
            setPlanSaving(false)
        }
    }

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return null

    const renderItemRow = (item, onTypeChange, onTextChange, onRemove, canRemove) => (
        <div key={item.id} className={s.ItemRow}>
            <div className={s.ItemTypeSwitch}>
                <button
                    type="button"
                    className={item.type === 'text' ? s.ItemTypeActive : ''}
                    onClick={() => onTypeChange('text')}
                    disabled={planSaving}
                >
                    <i className="bi bi-fonts"></i> Matn
                </button>
                <button
                    type="button"
                    className={item.type === 'media' ? s.ItemTypeActive : ''}
                    onClick={() => onTypeChange('media')}
                    disabled={planSaving}
                >
                    <i className="bi bi-image"></i> Media
                </button>
            </div>

            {item.type === 'text' ? (
                <input
                    type="text"
                    placeholder="Masalan: Ertalab 10ml ukol"
                    value={item.text}
                    onChange={(e) => onTextChange(e.target.value)}
                    disabled={planSaving}
                />
            ) : (
                <div className={s.MediaInputWrap}>
                    <i className="bi bi-image"></i>
                    <input
                        type="text"
                        placeholder="Masalan: Tish rentgen surati yuklansin"
                        value={item.text}
                        onChange={(e) => onTextChange(e.target.value)}
                        disabled={planSaving}
                    />
                </div>
            )}

            {canRemove && (
                <button type="button" className={s.RemoveItemBtn} onClick={onRemove} disabled={planSaving}>
                    <i className="bi bi-x"></i>
                </button>
            )}
        </div>
    )

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate('/doctor-waiting-patients')}>
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
                    {patient.status || 'Faol'} <i className="bi bi-chevron-down"></i>
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

            {patient.complaints?.length > 0 && (
                <div className={s.ComplaintsSection}>
                    <h2>Shikoyatlar</h2>
                    <p className={s.ComplaintsHint}>Davolash rejasi qo'shish uchun shikoyatni tanlang</p>
                    <div className={s.ComplaintsList}>
                        {patient.complaints.filter(c => c.status === "WAITING").map((c) => (
                            <button
                                type="button"
                                key={c.id}
                                className={`${s.ComplaintCard} ${selectedComplaintId === c.id ? s.ComplaintCardSelected : ''}`}
                                onClick={() => handleSelectComplaint(c)}
                            >
                                <div className={s.ComplaintTop}>
                                    <span className={`${s.StatusTag} ${s[c.status?.toLowerCase()]}`}>
                                        {STATUS_LABELS[c.status] || c.status}
                                    </span>
                                    <DateTimeFormatter date={c.created_at} format="datetime" className={s.ComplaintDate} />
                                </div>
                                <p>{c.complaint}</p>
                                {selectedComplaintId === c.id && (
                                    <span className={s.SelectedTag}><i className="bi bi-check-circle-fill"></i> Tanlandi</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedComplaint && (
                <form className={s.PlanForm} onSubmit={handleSubmitPlan}>
                    <div className={s.PlanFormHead}>
                        <div>
                            <h2>Davolash rejasi</h2>
                            <p className={s.PlanFormSub}>Shikoyat: <span>{selectedComplaint.complaint}</span></p>
                        </div>
                        <button type="button" className={s.CancelSelectBtn} onClick={() => setSelectedComplaintId(null)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className={s.Field}>
                        <label>Tashxis nomi *</label>
                        <input
                            type="text"
                            placeholder="Masalan: Jag' tish korreksiyasi"
                            value={planDiagnosis}
                            onChange={(e) => setPlanDiagnosis(e.target.value)}
                            disabled={planSaving}
                        />
                    </div>

                    {/* ---- Tashxisga tegishli media + izoh ---- */}
                    <div className={s.PlanMediaBlock}>
                        <div className={s.DaysHead}>
                            <label>Tashxis uchun media va izoh (ixtiyoriy)</label>
                            <button type="button" className={s.AddDayBtn} onClick={addPlanMedia} disabled={planSaving}>
                                <i className="bi bi-plus-lg"></i> Media qo'shish
                            </button>
                        </div>

                        {planMedia.length > 0 && (
                            <div className={s.PlanMediaList}>
                                {planMedia.map((m) => (
                                    <div key={m.id} className={s.PlanMediaRow}>
                                        <label className={s.PlanMediaFileLabel}>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,application/pdf"
                                                disabled={planSaving}
                                                onChange={(e) => updatePlanMediaFile(m.id, e.target.files?.[0] || null)}
                                            />
                                            <i className={`bi ${m.file ? 'bi-check-circle-fill' : 'bi-paperclip'}`}></i>
                                            <span>{m.file ? m.file.name : 'Fayl tanlash'}</span>
                                        </label>

                                        <input
                                            type="text"
                                            className={s.PlanMediaTextInput}
                                            placeholder="Izoh (masalan: Rentgen surati)"
                                            value={m.media_text}
                                            maxLength={50}
                                            onChange={(e) => updatePlanMediaText(m.id, e.target.value)}
                                            disabled={planSaving}
                                        />

                                        <button
                                            type="button"
                                            className={s.RemoveItemBtn}
                                            onClick={() => removePlanMedia(m.id)}
                                            disabled={planSaving}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={s.ModeSwitch}>
                        <button type="button" className={planMode === 'same' ? s.ModeActive : ''} onClick={() => setPlanMode('same')} disabled={planSaving}>
                            <i className="bi bi-arrow-repeat"></i> Har kuni bir xil
                        </button>
                        <button type="button" className={planMode === 'custom' ? s.ModeActive : ''} onClick={() => setPlanMode('custom')} disabled={planSaving}>
                            <i className="bi bi-calendar2-week"></i> Har kuni alohida
                        </button>
                    </div>

                    {planMode === 'same' ? (
                        <div className={s.SameModeBlock}>
                            <div className={s.Field}>
                                <label>Necha kun davom etadi *</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    className={s.DayCountInput}
                                    value={sameDayCount}
                                    onChange={(e) => setSameDayCount(e.target.value)}
                                    disabled={planSaving}
                                />
                                <span className={s.FieldHint}>
                                    Quyidagi tartib har {sameDayCount || '—'} kun davomida bir xil qo'llaniladi
                                </span>
                            </div>

                            <div className={s.ItemsList}>
                                <label className={s.ItemsLabel}>Kunlik tartib</label>
                                {sameItems.map((item) => renderItemRow(
                                    item,
                                    (type) => updateSameItemType(item.id, type),
                                    (text) => updateSameItemText(item.id, text),
                                    () => removeSameItem(item.id),
                                    sameItems.length > 1
                                ))}
                                <button type="button" className={s.AddItemBtn} onClick={addSameItem} disabled={planSaving}>
                                    <i className="bi bi-plus"></i> Necha mahal dori/muolaja qo'shish
                                </button>
                            </div>

                            <div className={s.Field}>
                                <label>Umumiy izoh (ixtiyoriy)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Masalan: bemor holati yaxshilanayabdi"
                                    value={sameNote}
                                    onChange={(e) => setSameNote(e.target.value)}
                                    disabled={planSaving}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={s.DaysHead}>
                                <label>Davolanish kunlari · {planDays.length} kun</label>
                                <button type="button" className={s.AddDayBtn} onClick={addDay} disabled={planSaving}>
                                    <i className="bi bi-plus-lg"></i> Kun qo'shish
                                </button>
                            </div>

                            <div className={s.DaysList}>
                                {planDays.map((day, dayIndex) => (
                                    <div key={day.id} className={s.DayCard}>
                                        <div className={s.DayCardHead}>
                                            <span className={s.DayBadge}>{dayIndex + 1}-kun</span>
                                            {planDays.length > 1 && (
                                                <button type="button" className={s.RemoveDayBtn} onClick={() => removeDay(day.id)} disabled={planSaving}>
                                                    <i className="bi bi-trash3"></i>
                                                </button>
                                            )}
                                        </div>

                                        <div className={s.ItemsList}>
                                            {day.items.map((item) => renderItemRow(
                                                item,
                                                (type) => updateItemType(day.id, item.id, type),
                                                (text) => updateItemText(day.id, item.id, text),
                                                () => removeItem(day.id, item.id),
                                                day.items.length > 1
                                            ))}
                                            <button type="button" className={s.AddItemBtn} onClick={() => addItem(day.id)} disabled={planSaving}>
                                                <i className="bi bi-plus"></i> Necha mahal dori/muolaja qo'shish
                                            </button>
                                        </div>

                                        <textarea
                                            className={s.DayNote}
                                            rows={2}
                                            placeholder="Ixtiyoriy izoh — masalan: bemor holati yaxshilanayabdi"
                                            value={day.note}
                                            onChange={(e) => updateDayNote(day.id, e.target.value)}
                                            disabled={planSaving}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {planError && <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {planError}</p>}
                    {planSuccess && (
                        <p className={s.FormSuccess}>
                            <i className="bi bi-check-circle-fill"></i>
                            Davolash rejasi muvaffaqiyatli qo'shildi. Bemorni "Jarayondagi bemorlar" qismida ko'rishingiz mumkin
                        </p>
                    )}

                    <button type="submit" className={s.SubmitPlanBtn} disabled={planSaving}>
                        {planSaving ? 'Saqlanmoqda...' : "Davolash rejasini saqlash"}
                    </button>
                </form>
            )}

        </div>
    )
}

export default DoctorWaitingPatientDetail