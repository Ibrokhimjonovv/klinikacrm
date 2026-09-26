import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './DoctorWaitingPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../../context/context';
import Modal from '../../../../components/Modal/Modal';
import ImageZoomViewer from '../../../../components/shared/ImageZoomViewer/ImageZoomViewer';

import Select from 'react-select';

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

const DIAG_STATUS_LABELS = {
    REQUESTED: 'Yuborildi',
    ASSIGNED: 'Biriktirildi',
    IN_PROGRESS: 'Jarayonda',
    COMPLETED: 'Natija tayyor',
    NO_SHOW: 'Kelmagan',
    CANCELLED: 'Bekor qilingan',
}

const CARE_TYPE_CHOICES = [
    { value: 'OUTPATIENT', label: 'Qatnab davolanish' },
    { value: 'INPATIENT', label: 'Yotib davolanish' },
]

const ROOM_TYPE_LABELS = {
    STANDARD: 'Standard',
    LUX: 'Lux',
}

const getFileUrl = (path) => {
    if (!path) return null
    if (/^https?:\/\//i.test(path)) return path
    try {
        const origin = new URL(api).origin
        return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
    } catch {
        return path
    }
}

// Helper: URL rasm ekanligini tekshirish
const isImageFile = (url) => {
    if (!url) return false
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(url)
}

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
})

const formatSum = (n) => Math.round(n).toLocaleString('uz-UZ') + " so'm"

// ✅ item'da endi: matn, VAQT, dori, xizmat va miqdor bor.
// "service" — backend TreatmentPlanItem uchun MAJBURIY maydon
// (serializer.create() da service bo'lmasa ValidationError beradi),
// shuning uchun uni har doim item bilan birga yuboramiz.
const makeEmptyItem = (nextId) => ({
    id: nextId(),
    text: '',
    time: '',            // ✅ yangi — muolaja/dori vaqti
    servicePriceId: '',  // tanlangan DORI id'si
    serviceId: '',        // tanlangan XIZMAT id'si (backend "service" maydoniga boradi)
    quantity: 1,
})

const SERVICE_SELECT_STYLES = {
    control: (base, state) => ({
        ...base,
        borderRadius: '8px',
        borderColor: state.isFocused ? '#e5e7eb' : '#e5e7eb',
        boxShadow: 'none',
        cursor: 'pointer',
        minHeight: '38px',
        '&:hover': {
            borderColor: '#0e1b33',
        },
    }),

    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? '#0e1b33'
            : state.isFocused
                ? '#eff6ff'
                : '#fff',
        color: state.isSelected ? '#fff' : '#111827',
        cursor: 'pointer',
        borderRadius: '0',
    }),

    menu: (base) => ({
        ...base,
        borderRadius: '12px',
        overflow: 'hidden',
        zIndex: 9999,
    }),

    placeholder: (base) => ({
        ...base,
        color: '#9ca3af',
    }),

    singleValue: (base) => ({
        ...base,
        color: '#111827',
        fontWeight: 500,
    }),
}

// ✅ Dori select'i uchun — miqdor input'i unga yopishib turishi
// uchun o'ng tomondagi burchaklarni to'g'irlaymiz (faqat dori
// tanlangan holatda ishlatiladi)
const MEDICINE_SELECT_ATTACHED_STYLES = {
    ...SERVICE_SELECT_STYLES,
    control: (base, state) => ({
        ...SERVICE_SELECT_STYLES.control(base, state),
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderRight: 'none',
    }),
}

const DoctorWaitingPatientTreatmentDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { fetchDoctorCounts } = useAppContext()
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const idCounter = useRef(0)
    const nextId = () => (idCounter.current += 1)

    const [diagnosticRequests, setDiagnosticRequests] = useState([])
    const [requestsLoading, setRequestsLoading] = useState(false)

    const [selectedComplaintId, setSelectedComplaintId] = useState(null)
    const [planDiagnosis, setPlanDiagnosis] = useState('')

    const [planMedia, setPlanMedia] = useState([])

    const [planMode, setPlanMode] = useState('same')

    const [sameDayCount, setSameDayCount] = useState(1)
    const [sameItems, setSameItems] = useState([makeEmptyItem(nextId)])
    const [sameNote, setSameNote] = useState('')

    const [planDays, setPlanDays] = useState([])

    const [planSaving, setPlanSaving] = useState(false)
    const [planError, setPlanError] = useState('')
    const [planSuccess, setPlanSuccess] = useState(false)

    const [medicines, setMedicines] = useState([])
    const [medicinesLoading, setMedicinesLoading] = useState(true)

    // ✅ Xizmatlar (servicelar) ro'yxati — dori tanlovi yonida
    const [services, setServices] = useState([])
    const [servicesLoading, setServicesLoading] = useState(true)

    // ---- Davolanish turi (Qatnab / Yotib) va xona-yotoq tanlash ----
    const [careType, setCareType] = useState('OUTPATIENT')
    const [rooms, setRooms] = useState([])
    const [roomsLoading, setRoomsLoading] = useState(false)
    const [selectedRoomId, setSelectedRoomId] = useState('')
    const [selectedBedId, setSelectedBedId] = useState('')

    // ---- Rasm modal (zoom bilan) ----
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

    const fetchRooms = async () => {
        try {
            setRoomsLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/rooms/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`Rooms HTTP error: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setRooms(list.filter(r => r.is_active))
        } catch (err) {
            console.error('Xonalarni olishda xatolik:', err)
        } finally {
            setRoomsLoading(false)
        }
    }

    const handleCareTypeChange = (type) => {
        setCareType(type)
        if (type === 'INPATIENT' && rooms.length === 0 && !roomsLoading) {
            fetchRooms()
        }
    }

    const handleSelectRoom = (roomId) => {
        setSelectedRoomId(prev => (prev === roomId ? '' : roomId))
        setSelectedBedId('')
    }

    const selectedRoomForCare = rooms.find(r => String(r.id) === String(selectedRoomId)) || null

    const fetchMedicines = async () => {
        try {
            setMedicinesLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/medicine/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setMedicines(
                list
                    .filter(m => m.is_active)
                    .map(m => ({
                        id: m.id,
                        name: m.name,
                        description: m.description,
                        price: Number(m.price),
                    }))
            )
        } catch (err) {
            console.error('Dorilar ro\'yxatini olishda xatolik:', err)
        } finally {
            setMedicinesLoading(false)
        }
    }

    // ✅ Xizmatlarni yuklash — /services/ endpointi (diagnostika
    // sahifasida ishlatilgan endpoint bilan bir xil)
    const fetchServices = async () => {
        try {
            setServicesLoading(true)
            const token = localStorage.getItem('hospital_access')
            const res = await fetch(`${api}/services/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`Services HTTP error: ${res.status}`)
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.results || []
            setServices(
                list
                    .filter(sv => sv.is_active)
                    .map(sv => ({
                        id: sv.id,
                        name: sv.name,
                        description: sv.description,
                        price: Number(sv.price),
                    }))
            )
        } catch (err) {
            console.error('Xizmatlar ro\'yxatini olishda xatolik:', err)
        } finally {
            setServicesLoading(false)
        }
    }

    const fetchDiagnosticRequests = async () => {
        try {
            setRequestsLoading(true)
            const token = localStorage.getItem('hospital_access')

            const res = await fetch(`${api}/examination-requests/`, {
                method: 'GET',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(`Examination requests HTTP error: ${res.status}`)

            const data = await res.json()
            const requests = Array.isArray(data) ? data : data.results || []

            const medicalVisitIds = (patient?.complaints || [])
                .map((complaint) => Number(complaint.id))
                .filter(Boolean)

            const patientRequests = requests.filter((request) =>
                medicalVisitIds.includes(Number(request.medical_visit))
            )

            setDiagnosticRequests(patientRequests)
        } catch (err) {
            console.error('Examination requests olishda xatolik:', err)
        } finally {
            setRequestsLoading(false)
        }
    }

    useEffect(() => {
        fetchPatient()
        fetchMedicines()
        fetchServices()
    }, [id])

    useEffect(() => {
        if (patient?.complaints?.length > 0) fetchDiagnosticRequests()
    }, [patient])

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
        setCareType('OUTPATIENT')
        setSelectedRoomId('')
        setSelectedBedId('')
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
    const makeEmptyMedia = () => ({ id: nextId(), file: null, media_text: '' })
    const addPlanMedia = () => setPlanMedia(prev => [...prev, makeEmptyMedia()])
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
    // ✅ Vaqt tanlash
    const updateSameItemTime = (itemId, time) =>
        setSameItems(prev => prev.map(it => it.id === itemId ? { ...it, time } : it))
    // Dori tanlash
    const updateSameItemMedicine = (itemId, servicePriceId) =>
        setSameItems(prev => prev.map(it => it.id === itemId ? { ...it, servicePriceId } : it))
    // ✅ Xizmat tanlash
    const updateSameItemService = (itemId, serviceId) =>
        setSameItems(prev => prev.map(it => it.id === itemId ? { ...it, serviceId } : it))
    const updateSameItemQuantity = (itemId, quantity) =>
        setSameItems(prev => prev.map(it => it.id === itemId ? { ...it, quantity: Math.max(1, Number(quantity) || 1) } : it))

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
    // ✅ Vaqt tanlash
    const updateItemTime = (dayId, itemId, time) => setPlanDays(prev => prev.map(d =>
        d.id === dayId
            ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, time } : it) }
            : d
    ))
    // Dori tanlash
    const updateItemMedicine = (dayId, itemId, servicePriceId) => setPlanDays(prev => prev.map(d =>
        d.id === dayId
            ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, servicePriceId } : it) }
            : d
    ))
    // ✅ Xizmat tanlash
    const updateItemService = (dayId, itemId, serviceId) => setPlanDays(prev => prev.map(d =>
        d.id === dayId
            ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, serviceId } : it) }
            : d
    ))
    const updateItemQuantity = (dayId, itemId, quantity) => setPlanDays(prev => prev.map(d =>
        d.id === dayId
            ? { ...d, items: d.items.map(it => it.id === itemId ? { ...it, quantity: Math.max(1, Number(quantity) || 1) } : it) }
            : d
    ))
    const updateDayNote = (dayId, note) => setPlanDays(prev => prev.map(d => d.id === dayId ? { ...d, note } : d))

    const isItemFilled = (item) => !!item.text.trim()

    // ---- JONLI NARX HISOBLASH ----
    const priceSummary = useMemo(() => {
        let itemsTotal = 0
        const breakdown = []

        const collectFromItems = (itemsArr, multiplier = 1) => {
            itemsArr.forEach(it => {
                const medicine = medicines.find(m => m.id === Number(it.servicePriceId))
                if (medicine) {
                    const lineTotal = medicine.price * (it.quantity || 1) * multiplier
                    itemsTotal += lineTotal
                    breakdown.push({
                        text: it.text,
                        medicineName: medicine.name,
                        quantity: it.quantity || 1,
                        unitPrice: medicine.price,
                        multiplier,
                        lineTotal,
                    })
                }

                // ✅ Xizmat narxi ham umumiy summaga qo'shiladi
                const service = services.find(sv => sv.id === Number(it.serviceId))
                if (service) {
                    const lineTotal = service.price * multiplier
                    itemsTotal += lineTotal
                    breakdown.push({
                        text: it.text,
                        medicineName: service.name,
                        quantity: 1,
                        unitPrice: service.price,
                        multiplier,
                        lineTotal,
                    })
                }
            })
        }

        // ---- Davolanish necha kun davom etishini aniqlash ----
        let treatmentDays = 0
        if (planMode === 'same') {
            treatmentDays = Number(sameDayCount) || 0
            collectFromItems(sameItems, treatmentDays)
        } else {
            treatmentDays = planDays.length
            planDays.forEach(day => collectFromItems(day.items, 1))
        }

        // ---- Yotib davolanish: xona narxi × kunlar soni ----
        const bedPricePerDay = careType === 'INPATIENT' && selectedRoomForCare
            ? Number(selectedRoomForCare.price_per_day) || 0
            : 0
        const bedTotal = bedPricePerDay * treatmentDays

        return {
            itemsTotal,
            bedPricePerDay,
            bedTotal,
            treatmentDays,
            grandTotal: itemsTotal + bedTotal,
            breakdown,
        }
    }, [planMode, sameItems, sameDayCount, planDays, medicines, services, careType, selectedRoomForCare])

    const calculateDayPrice = (items) => {
        return items.reduce((total, item) => {
            let sum = total

            const medicine = medicines.find(m => m.id === Number(item.servicePriceId))
            if (medicine) sum += medicine.price * (item.quantity || 1)

            // ✅ xizmat narxi ham kunlik narxga qo'shiladi
            const service = services.find(sv => sv.id === Number(item.serviceId))
            if (service) sum += service.price

            return sum
        }, 0)
    }


    // ✅ Item'ni backend formatiga o'giramiz: text, time, service.
    const mapItemForPayload = (it) => ({
        text: it.text,
        time: it.time || null,
        service: it.serviceId || null,
        dif: false,
    })

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
        if (careType === 'INPATIENT' && !selectedBedId) {
            setPlanError("Yotib davolanish uchun xona va yotoq tanlanishi shart")
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
            const dayPrice = calculateDayPrice(filledItems)

            daysPayload = Array.from({ length: count }, (_, i) => ({
                day_number: i + 1,
                note: sameNote,
                price: dayPrice,
                items: filledItems.map(mapItemForPayload),
                medicines: filledItems.map(it => ({
                    medicine: it.servicePriceId || null,
                    quantity: it.quantity || 1,
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
            daysPayload = planDays.map((d, index) => {
                const filledItems = d.items.filter(isItemFilled)

                return {
                    day_number: index + 1,
                    note: d.note,
                    price: calculateDayPrice(filledItems),
                    items: filledItems.map(mapItemForPayload),
                    medicines: filledItems.map(it => ({
                        medicine: it.servicePriceId || null,
                        quantity: it.quantity || 1,
                    })),
                }
            })
        }

        setPlanSaving(true)
        try {
            const token = localStorage.getItem('hospital_access')

            const payload = {
                complaint: selectedComplaint.id,
                diagnosis: planDiagnosis,
                days: daysPayload,
                total_price: priceSummary.grandTotal,
                care_type: careType,
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

            if (planId && filledMedia.length > 0) {
                const mediaBody = new FormData()
                filledMedia.forEach((m) => {
                    mediaBody.append('media', m.file)
                    mediaBody.append('media_text', m.media_text)
                })

                const mediaRes = await fetch(`${api}/mediaTreatmentUpload/${planId}/`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: mediaBody,
                })

                if (!mediaRes.ok) {
                    console.error('Media yuklashda xatolik:', await mediaRes.text())
                }
            }

            // ---- Yotib davolanish tanlangan bo'lsa, bemorni yotoqqa biriktiramiz ----
            if (careType === 'INPATIENT' && selectedBedId) {
                try {
                    const assignRes = await fetch(`${api}/room-assignments/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            bed: Number(selectedBedId),
                            patient: patient.id,
                            treatment_plan: planId,
                            price_per_day: selectedRoomForCare?.price_per_day ?? 0,
                            start_date: new Date().toISOString(),
                            status: 'ACTIVE',
                            note: '',
                        }),
                    })

                    if (!assignRes.ok) {
                        const assignData = await assignRes.json().catch(() => ({}))
                        console.error('Yotoqqa biriktirishda xatolik:', assignData)
                        setPlanError(
                            assignData?.bed?.[0] || assignData?.detail || assignData?.message ||
                            "Davolash rejasi saqlandi, lekin yotoqqa biriktirishda xatolik yuz berdi"
                        )
                    }
                } catch (assignErr) {
                    console.error('Room assignment so\'rovida xatolik:', assignErr)
                    setPlanError("Davolash rejasi saqlandi, lekin yotoqqa biriktirishda xatolik yuz berdi")
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

    // ------------------------------------------------------------
    // KO'RINADIGAN SHIKOYATLAR
    // Faqat WAITING yoki IN_PROGRESS bo'lgan va
    // hech bo'lmaganda bitta diagnostikasi mavjud shikoyatlar
    // ------------------------------------------------------------

    const visibleComplaints = useMemo(() => {
        const active = (patient?.complaints || []).filter(
            (c) => c.status === 'WAITING' || c.status === 'IN_PROGRESS'
        )

        return active.filter((complaint) => {
            const requests = diagnosticRequests.filter(
                (request) => Number(request.medical_visit) === Number(complaint.id)
            )

            // Hech bo'lmaganda bitta diagnostika yuborilgan bo'lsa ko'rinadi
            return requests.length > 0
        })
    }, [patient, diagnosticRequests])

    if (loading) return <div className={s.State}><p>Yuklanmoqda...</p></div>
    if (error) return <div className={s.State}><p>Xatolik: {error}</p></div>
    if (!patient) return null

    // ------------------------------------------------------------
    // BITTA DIAGNOSTIKA SO'ROVI KARTASI
    // ------------------------------------------------------------

    const renderRequestCard = (request) => {
        const fileUrl = getFileUrl(request.result?.result_file)
        const fileIsImage = isImageFile(fileUrl)

        return (
            <div key={request.id} className={s.DiagRequestCard}>
                <div className={s.DiagRequestTop}>
                    <div className={s.DiagTypesBadges} style={{ marginTop: 0 }}>
                        <span className={s.DiagTypeBadge}>
                            {request.service_detail?.name || 'Nomaʼlum xizmat'}
                        </span>
                    </div>
                </div>

                <div className={s.DiagRequestMeta}>
                    <span>
                        <i className="bi bi-person-badge"></i>
                        {request.assigned_to_detail?.full_name ||
                            request.assigned_to_detail?.username ||
                            'Hali biriktirilmagan'}
                    </span>
                    <span>
                        <i className="bi bi-calendar3"></i>
                        {request.requested_at ? (
                            <DateTimeFormatter date={request.requested_at} format="datetime" />
                        ) : (
                            '-'
                        )}
                    </span>
                </div>

                {request.doctor_note && (
                    <p className={s.DiagRequestNote}>{request.doctor_note}</p>
                )}

                <div className={s.DiagStatusRow}>
                    <label>Holati</label>
                    <span className={`${s.DiagStatusBadge} ${s[request.status?.toLowerCase()] || ''}`}>
                        {DIAG_STATUS_LABELS[request.status] || request.status}
                    </span>
                </div>

                {/* Natija kartasi */}
                {request.result && (
                    <div className={s.DiagResultBox}>
                        <div className={s.DiagResultHeader}>
                            <i className="bi bi-clipboard2-check-fill"></i>
                            <span>Diagnostika natijasi</span>
                        </div>

                        {request.result.result_text && (
                            <p className={s.DiagResultText}>{request.result.result_text}</p>
                        )}

                        {fileUrl && (
                            fileIsImage ? (
                                <button
                                    type="button"
                                    className={s.DiagResultFileBtn}
                                    onClick={() => openImageModal(fileUrl)}
                                >
                                    <i className="bi bi-image"></i> Natijani ko'rish
                                </button>
                            ) : (
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={s.DiagResultFileBtn}
                                >
                                    <i className="bi bi-paperclip"></i> Natija faylini ko'rish
                                </a>
                            )
                        )}

                        <div className={s.DiagResultFooter}>
                            <i className="bi bi-person-check"></i>
                            Kim bajardi:{' '}
                            <strong>
                                {request.result.completed_by_detail?.full_name ||
                                    request.result.completed_by_detail?.username ||
                                    '-'}
                            </strong>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ------------------------------------------------------------
    // Ustunlar sarlavhasi — har bir ItemRow'dagi ustun nima
    // ekanligini ko'rsatadi (jadval "th" qatoriga o'xshab).
    // Kenglik/flex qiymatlari renderItemRow bilan bir xil bo'lishi
    // kerak, aks holda ustunlar bir-biriga to'g'ri kelmaydi.
    // ------------------------------------------------------------

    const renderItemsHeader = () => (
        <div className={s.ItemsHeaderRow}>
            <span className={s.ItemsHeaderCell}>№</span>
            <span className={s.ItemsHeaderCell}>Muolaja / band tavsifi</span>
            <span className={s.ItemsHeaderCell}>Vaqti</span>
            <span className={s.ItemsHeaderCell}>Dori · miqdori</span>
            <span className={s.ItemsHeaderCell}>Xizmat turi</span>
        </div>
    )

    // ------------------------------------------------------------
    // Har bir band qatorida: tartib raqami, matn, VAQT,
    // DORI tanlovi (+ tanlangach unga yopishgan miqdor),
    // va XIZMAT tanlovi (backend uchun majburiy).
    // ------------------------------------------------------------

    const renderItemRow = (item, orderNumber, onTextChange, onTimeChange, onMedicineChange, onServiceSelectChange, onQuantityChange, onRemove, canRemove) => {
        const medicine = medicines.find(m => m.id === Number(item.servicePriceId))
        const selectedService = services.find(sv => sv.id === Number(item.serviceId))

        return (
            <div key={item.id} className={s.ItemRow}>
                <span className={s.ItemOrderBadge}>{orderNumber}</span>

                <input
                    type="text"
                    className={s.ItemTextInput}
                    placeholder="Masalan: Ertalab 10ml ukol"
                    value={item.text}
                    onChange={(e) => onTextChange(e.target.value)}
                    disabled={planSaving}
                />

                {/* ---- Vaqt tanlovi ---- */}
                <input
                    type="time"
                    className={s.ItemTimeInput}
                    value={item.time}
                    onChange={(e) => onTimeChange(e.target.value)}
                    disabled={planSaving}
                />

                {/* ---- Dori tanlovi + unga yopishgan miqdor ---- */}
                <div className={s.MedicineGroup}>
                    <Select
                        className={s.ServiceSelect}
                        isDisabled={planSaving || medicinesLoading}
                        placeholder={
                            medicinesLoading
                                ? "Dorilar yuklanmoqda..."
                                : "Dorini qidiring..."
                        }
                        isSearchable
                        options={medicines.map(m => ({
                            value: m.id,
                            label: `${m.name} — ${formatSum(m.price)}`
                        }))}
                        value={
                            medicine
                                ? { value: medicine.id, label: `${medicine.name} — ${formatSum(medicine.price)}` }
                                : null
                        }
                        onChange={(selected) =>
                            onMedicineChange(selected ? selected.value : '')
                        }
                        noOptionsMessage={({ inputValue }) =>
                            inputValue
                                ? `"${inputValue}" bo'yicha dori topilmadi`
                                : "Dorilar mavjud emas"
                        }
                        styles={medicine ? MEDICINE_SELECT_ATTACHED_STYLES : SERVICE_SELECT_STYLES}
                    />

                    {medicine && (
                        <input
                            type="number"
                            min={1}
                            className={s.QtyInputAttached}
                            value={item.quantity}
                            onChange={(e) => onQuantityChange(e.target.value)}
                            disabled={planSaving}
                        />
                    )}
                </div>

                {/* ---- Xizmat tanlovi (majburiy) ---- */}
                <Select
                    className={s.ServiceSelect}
                    isDisabled={planSaving || servicesLoading}
                    placeholder={
                        servicesLoading
                            ? "Xizmatlar yuklanmoqda..."
                            : "Xizmatni qidiring..."
                    }
                    isSearchable
                    options={services.map(sv => ({
                        value: sv.id,
                        label: `${sv.name} — ${formatSum(sv.price)}`
                    }))}
                    value={
                        selectedService
                            ? { value: selectedService.id, label: `${selectedService.name} — ${formatSum(selectedService.price)}` }
                            : null
                    }
                    onChange={(selected) =>
                        onServiceSelectChange(selected ? selected.value : '')
                    }
                    noOptionsMessage={({ inputValue }) =>
                        inputValue
                            ? `"${inputValue}" bo'yicha xizmat topilmadi`
                            : "Xizmatlar mavjud emas"
                    }
                    styles={SERVICE_SELECT_STYLES}
                />

                {canRemove && (
                    <button type="button" className={s.RemoveItemBtn} onClick={onRemove} disabled={planSaving}>
                        <i className="bi bi-x"></i>
                    </button>
                )}
            </div>
        )
    }

    // ------------------------------------------------------------
    // DAVOLASH REJASI FORMASI (shikoyat ichida ochiladi)
    // ------------------------------------------------------------

    const renderPlanForm = () => (
        <form className={s.ComplaintForm} onSubmit={handleSubmitPlan}>
            <div className={s.PlanFormHead}>
                <h2>Davolash rejasi</h2>
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

            {/* ---- Davolanish turi ---- */}
            <div className={s.Field}>
                <label>Davolanish turi *</label>
                <div className={s.ModeSwitch}>
                    {CARE_TYPE_CHOICES.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            className={careType === c.value ? s.ModeActive : ''}
                            onClick={() => handleCareTypeChange(c.value)}
                            disabled={planSaving}
                        >
                            <i className={`bi ${c.value === 'INPATIENT' ? 'bi-hospital' : 'bi-person-walking'}`}></i> {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ---- Yotib davolanish tanlansa — xona va yotoq tanlash ---- */}
            {careType === 'INPATIENT' && (
                <div className={s.RoomSection}>
                    <label className={s.ItemsLabel}>Xona tanlang *</label>

                    {roomsLoading ? (
                        <div className={s.LoadingText}>
                            <i className="bi bi-arrow-repeat"></i>
                            Xonalar yuklanmoqda...
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className={s.EmptyServices}>
                            <i className="bi bi-info-circle"></i>
                            <span>Faol xonalar topilmadi</span>
                        </div>
                    ) : (
                        <>
                            <div className={s.RoomGrid}>
                                {rooms.map((room) => {
                                    const freeCount = (room.beds || []).filter(b => b.is_active && !b.is_occupied).length
                                    const isFull = freeCount === 0
                                    const isSelected = String(room.id) === String(selectedRoomId)

                                    return (
                                        <button
                                            key={room.id}
                                            type="button"
                                            className={`${s.RoomOption} ${isSelected ? s.RoomOptionSelected : ''} ${isFull ? s.RoomOptionFull : ''}`}
                                            onClick={() => !isFull && handleSelectRoom(room.id)}
                                            disabled={planSaving || isFull}
                                        >
                                            <span className={s.RoomOptionTitle}>
                                                {room.number}-xona
                                            </span>
                                            <span className={s.RoomOptionMeta}>
                                                {ROOM_TYPE_LABELS[room.room_type] || room.room_type} · {formatSum(room.price_per_day)}/kun
                                            </span>
                                            <span className={s.RoomOptionMeta}>
                                                {isFull ? "Bo'sh yotoq yo'q" : `${freeCount} ta bo'sh yotoq`}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedRoomForCare && (
                                <div className={s.BedSection}>
                                    <label className={s.ItemsLabel}>Yotoq tanlang *</label>
                                    <div className={s.BedGrid}>
                                        {(selectedRoomForCare.beds || []).filter(b => b.is_active).map((bed) => {
                                            const isSelected = String(bed.id) === String(selectedBedId)

                                            return (
                                                <button
                                                    key={bed.id}
                                                    type="button"
                                                    className={`${s.BedOption} ${bed.is_occupied ? s.BedOptionOccupied : s.BedOptionFree} ${isSelected ? s.BedOptionSelected : ''}`}
                                                    onClick={() => !bed.is_occupied && setSelectedBedId(bed.id)}
                                                    disabled={planSaving || bed.is_occupied}
                                                    title={bed.is_occupied ? 'Band' : "Bo'sh"}
                                                >
                                                    {bed.name}-yotoq
                                                    <span>{bed.is_occupied ? 'Band' : "Bo'sh"}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className={s.PlanMediaBlock}>
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
                        {renderItemsHeader()}
                        {sameItems.map((item, index) => renderItemRow(
                            item,
                            index + 1,
                            (text) => updateSameItemText(item.id, text),
                            (time) => updateSameItemTime(item.id, time),
                            (mid) => updateSameItemMedicine(item.id, mid),
                            (sid) => updateSameItemService(item.id, sid),
                            (qty) => updateSameItemQuantity(item.id, qty),
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
                                    {renderItemsHeader()}
                                    {day.items.map((item, index) => renderItemRow(
                                        item,
                                        index + 1,
                                        (text) => updateItemText(day.id, item.id, text),
                                        (time) => updateItemTime(day.id, item.id, time),
                                        (mid) => updateItemMedicine(day.id, item.id, mid),
                                        (sid) => updateItemService(day.id, item.id, sid),
                                        (qty) => updateItemQuantity(day.id, item.id, qty),
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

            {/* ---- JONLI NARX XULOSASI ---- */}
            <div className={s.PriceSummaryBox}>
                <div className={s.PriceSummaryHead}>
                    <i className="bi bi-receipt"></i>
                    <span>Hisob-kitob</span>
                </div>

                {careType === 'INPATIENT' && selectedRoomForCare && (
                    <div className={s.PriceLine}>
                        <span>
                            Yotoq narxi
                            <em>
                                {selectedRoomForCare.block} — {selectedRoomForCare.number}-xona,{' '}
                                {formatSum(priceSummary.bedPricePerDay)}/kun × {priceSummary.treatmentDays || 0} kun
                            </em>
                        </span>
                        <span>{formatSum(priceSummary.bedTotal)}</span>
                    </div>
                )}

                {priceSummary.breakdown.length > 0 && (
                    <>
                        <div className={s.PriceDivider}>Muolaja / dori-darmon / xizmatlar</div>
                        {priceSummary.breakdown.map((row, i) => (
                            <div key={i} className={s.PriceLine}>
                                <span>
                                    {row.medicineName}
                                    <em>
                                        {row.quantity} dona × {formatSum(row.unitPrice)}
                                        {row.multiplier > 1 && ` × ${row.multiplier} kun`}
                                    </em>
                                </span>
                                <span>{formatSum(row.lineTotal)}</span>
                            </div>
                        ))}
                    </>
                )}

                <div className={s.PriceGrandTotal}>
                    <span>Umumiy summa</span>
                    <span>{formatSum(priceSummary.grandTotal)}</span>
                </div>
            </div>

            {planError && <p className={s.FormError}><i className="bi bi-exclamation-circle-fill"></i> {planError}</p>}
            {planSuccess && (
                <p className={s.FormSuccess}>
                    <i className="bi bi-check-circle-fill"></i>
                    Davolash rejasi muvaffaqiyatli qo'shildi{careType === 'INPATIENT' && selectedBedId ? ', bemor yotoqqa biriktirildi' : ''}. Bemorni "Jarayondagi bemorlar" qismida ko'rishingiz mumkin
                </p>
            )}

            <button type="submit" className={s.SubmitPlanBtn} disabled={planSaving}>
                {planSaving ? 'Saqlanmoqda...' : `Rejani saqlash`}
            </button>
        </form>
    )

    return (
        <div className={s.DetailPage}>

            <button className={s.BackBtn} onClick={() => navigate(-1)}>
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

            {/* SHIKOYATLAR — diagnostikasi yuborilganlar */}
            {visibleComplaints.length > 0 && (
                <div className={s.ComplaintsSection}>
                    <h2>Shikoyatlar</h2>
                    <p className={s.ComplaintsHint}>Davolash rejasi qo'shish uchun shikoyatni tanlang</p>

                    <div className={s.ComplaintsList}>
                        {visibleComplaints.map((c) => {
                            const complaintRequests = diagnosticRequests.filter(
                                (request) => Number(request.medical_visit) === Number(c.id)
                            )

                            // ✅ Hamma yuborilgan diagnostikalar ko'rinadi
                            const visibleRequests = complaintRequests

                            const hasVisibleDiagnostics = visibleRequests.length > 0
                            const isSelected = selectedComplaintId === c.id
                            // Boshqa bir shikoyat tanlangan bo'lsa, bu kartani
                            // xiralashtiramiz — shifokor davolash rejasi
                            // formasidan chalg'imasligi uchun.
                            const isDimmed = selectedComplaintId !== null && !isSelected

                            return (
                                <div
                                    key={c.id}
                                    className={`${s.ComplaintGroup} ${isSelected ? s.ComplaintGroupSelected : ''} ${isDimmed ? s.ComplaintGroupBlurred : ''}`}
                                >
                                    {/* SHIKOYAT */}
                                    <button
                                        type="button"
                                        className={s.ComplaintCard}
                                        onClick={() => handleSelectComplaint(c)}
                                    >
                                        <div className={s.ComplaintTop}>
                                            <span className={`${s.StatusTag} ${s[c.status?.toLowerCase()]}`}>
                                                {STATUS_LABELS[c.status] || c.status}
                                            </span>
                                            <DateTimeFormatter date={c.created_at} format="datetime" className={s.ComplaintDate} />
                                        </div>

                                        <p>{c.complaint}</p>

                                        <div className={s.ComplaintBadges}>
                                            <div className={s.ComplaintBadgesLeft}>
                                                {hasVisibleDiagnostics && (
                                                    <span className={s.DiagSentTag}>
                                                        <i className="bi bi-check-circle-fill"></i>
                                                        Diagnostikalar ({visibleRequests.length})
                                                    </span>
                                                )}
                                            </div>

                                            <span className={isSelected ? s.SelectedTag : s.PlanHintTag}>
                                                <i className={`bi ${isSelected ? 'bi-check-circle-fill' : 'bi-plus-circle'}`}></i>
                                                {isSelected ? 'Tanlandi' : "Reja qo'shish"}
                                            </span>
                                        </div>
                                    </button>

                                    {/* SHU SHIKOYATNING DIAGNOSTIKALARI */}
                                    {requestsLoading && !hasVisibleDiagnostics ? (
                                        <div className={s.LoadingText}>
                                            <i className="bi bi-arrow-repeat"></i>
                                            Diagnostikalar yuklanmoqda...
                                        </div>
                                    ) : (
                                        hasVisibleDiagnostics && (
                                            <div className={s.ComplaintDiagWrap}>
                                                <h3 className={s.ComplaintDiagTitle}>
                                                    <i className="bi bi-clipboard2-pulse"></i>
                                                    Diagnostikalar
                                                </h3>

                                                <div className={s.ComplaintDiagList}>
                                                    {visibleRequests.map(renderRequestCard)}
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* DAVOLASH REJASI FORMASI — tanlangan shikoyat ichida */}
                                    {isSelected && renderPlanForm()}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* RASM MODAL — zoom bilan */}
            <Modal
                isOpen={modalOpen}
                onClose={closeImageModal}
                fullWidth
            >
                {modalImage && (
                    <ImageZoomViewer
                        src={modalImage}
                        alt="Diagnostika natijasi"
                    />
                )}
            </Modal>
        </div>
    )
}

export default DoctorWaitingPatientTreatmentDetail