import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import s from './NurseProgressPatientDetail.module.scss'
import { api } from '../../../../App'
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter'
import Modal from '../../../../components/Modal/Modal'

const calcAge = (birthDate) => {
    if (!birthDate) return '?'

    const diff =
        Date.now() - new Date(birthDate).getTime()

    return Math.floor(
        diff / (1000 * 60 * 60 * 24 * 365.25)
    )
}

const authHeaders = (token, json = true) => ({
    Authorization: `Bearer ${token}`,
    ...(json
        ? { 'Content-Type': 'application/json' }
        : {}),
})

const doctorFullName = (doc) => {
    if (!doc) return ''

    return [
        doc.first_name,
        doc.middle_name,
        doc.last_name,
    ]
        .filter(Boolean)
        .join(' ')
}

const getPlanStatus = (plan) => {
    const progress = plan.progress ?? 0

    if (
        plan.is_end ||
        plan.completed_at ||
        progress >= 100
    ) {
        return {
            label: 'Yakunlandi',
            className: 'done',
        }
    }

    if (
        plan.started_at ||
        progress > 0
    ) {
        return {
            label: 'Jarayonda',
            className: 'active',
        }
    }

    return {
        label: 'Boshlanmagan',
        className: 'watch',
    }
}

const NurseProgressPatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    const [patient, setPatient] = useState(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [treatmentHistory, setTreatmentHistory] =
        useState([])

    const [historyLoading, setHistoryLoading] =
        useState(true)

    const [historyError, setHistoryError] =
        useState(null)

    const [togglingItemId, setTogglingItemId] =
        useState(null)

    const [confirmItem, setConfirmItem] =
        useState(null)

    // =====================================================
    // BEMORNI OLISH
    // =====================================================

    const fetchPatient = async () => {
        try {
            const token =
                localStorage.getItem('hospital_access')

            const res = await fetch(
                `${api}/patientInfo/${id}/`,
                {
                    method: 'GET',
                    headers: authHeaders(token),
                }
            )

            if (!res.ok) {
                throw new Error(
                    `HTTP error! status: ${res.status}`
                )
            }

            const data = await res.json()

            setPatient(data)
        } catch (err) {
            console.error(
                'Bemorni olishda xatolik:',
                err
            )

            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // =====================================================
    // DAVOLASH REJALARINI OLISH
    // =====================================================

    const fetchTreatmentHistory = async (
        silent = false
    ) => {
        try {
            if (!silent) {
                setHistoryLoading(true)
            }

            const token =
                localStorage.getItem('hospital_access')

            const res = await fetch(
                `${api}/patient/${id}/treatments/`,
                {
                    method: 'GET',
                    headers: authHeaders(token),
                }
            )

            if (!res.ok) {
                throw new Error(
                    `HTTP error! status: ${res.status}`
                )
            }

            const data = await res.json()

            setTreatmentHistory(
                (data.treatments || [])
                    .filter((plan) => !plan.is_end)
            )
        } catch (err) {
            console.error(
                'Muolajalarni olishda xatolik:',
                err
            )

            if (!silent) {
                setHistoryError(err.message)
            }
        } finally {
            if (!silent) {
                setHistoryLoading(false)
            }
        }
    }

    useEffect(() => {
        fetchPatient()
        fetchTreatmentHistory()
    }, [id])

    // =====================================================
    // MUOLAJANI BELGILASH
    // =====================================================

    const handleToggleItem = async (
        planId,
        dayId,
        item
    ) => {
        // Agar allaqachon bajarilgan bo'lsa,
        // qayta o'zgartirishga ruxsat bermaymiz
        if (item.checked) {
            return
        }

        setConfirmItem({
            planId,
            dayId,
            item,
        })
    }

    // =====================================================
    // TASDIQLAB BAJARILGAN QILISH
    // =====================================================

    const confirmMarkItemDone = async () => {
        if (!confirmItem) return

        const {
            planId,
            dayId,
            item,
        } = confirmItem

        setConfirmItem(null)

        const newChecked = true

        setTogglingItemId(item.id)

        // Optimistic update
        setTreatmentHistory((prev) =>
            prev.map((plan) =>
                plan.id !== planId
                    ? plan
                    : {
                        ...plan,

                        days: plan.days.map(
                            (day) =>
                                day.id !== dayId
                                    ? day
                                    : {
                                        ...day,

                                        items:
                                            day.items.map(
                                                (it) =>
                                                    it.id === item.id
                                                        ? {
                                                            ...it,
                                                            checked:
                                                                newChecked,
                                                        }
                                                        : it
                                            ),
                                    }
                        ),
                    }
            )
        )

        try {
            const token =
                localStorage.getItem('hospital_access')

            const res = await fetch(
                `${api}/treatmentItem/${item.id}/check/`,
                {
                    method: 'PATCH',
                    headers: authHeaders(token),
                    body: JSON.stringify({
                        checked: newChecked,
                    }),
                }
            )

            if (!res.ok) {
                throw new Error(
                    `HTTP error! status: ${res.status}`
                )
            }

            const data = await res.json()

            // Backend qaytargan ma'lumotni qo'llash
            if (data?.data) {
                setTreatmentHistory((prev) =>
                    prev.map((plan) =>
                        plan.id !== planId
                            ? plan
                            : {
                                ...plan,

                                days: plan.days.map(
                                    (day) =>
                                        day.id !== dayId
                                            ? day
                                            : {
                                                ...day,

                                                items:
                                                    day.items.map(
                                                        (it) =>
                                                            it.id === item.id
                                                                ? {
                                                                    ...it,
                                                                    ...data.data,
                                                                }
                                                                : it
                                                    ),
                                            }
                                ),
                            }
                    )
                )
            }

            // Backenddagi real holatni yangilash
            await fetchTreatmentHistory(true)
        } catch (err) {
            console.error(
                'Muolajani belgilashda xatolik:',
                err
            )

            // Xato bo'lsa rollback
            setTreatmentHistory((prev) =>
                prev.map((plan) =>
                    plan.id !== planId
                        ? plan
                        : {
                            ...plan,

                            days: plan.days.map(
                                (day) =>
                                    day.id !== dayId
                                        ? day
                                        : {
                                            ...day,

                                            items:
                                                day.items.map(
                                                    (it) =>
                                                        it.id === item.id
                                                            ? {
                                                                ...it,
                                                                checked:
                                                                    false,
                                                            }
                                                            : it
                                                ),
                                        }
                            ),
                        }
                )
            )
        } finally {
            setTogglingItemId(null)
        }
    }

    // =====================================================
    // LOADING / ERROR
    // =====================================================

    if (loading) {
        return (
            <div className={s.State}>
                <div className={s.StateSpinner}></div>
                <p>Yuklanmoqda...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className={s.State}>
                <div className={s.ErrorStateIcon}>
                    <i className="bi bi-exclamation-triangle"></i>
                </div>

                <p>
                    Bemorni yuklashda xatolik:
                    <br />
                    {error}
                </p>
            </div>
        )
    }

    if (!patient) {
        return null
    }

    // =====================================================
    // ITEM RENDER
    // =====================================================

    const renderItem = (
        plan,
        day,
        item
    ) => {
        const isChecked = !!item.checked

        const isToggling =
            togglingItemId === item.id

        return (
            <div
                className={`${s.TreatmentItem} ${
                    isChecked
                        ? s.TreatmentItemDone
                        : ''
                }`}
            >

                <div className={s.TreatmentItemMain}>

                    <div
                        className={`${s.TreatmentIcon} ${
                            isChecked
                                ? s.TreatmentIconDone
                                : ''
                        }`}
                    >
                        <i
                            className={`bi ${
                                isChecked
                                    ? 'bi-check-circle-fill'
                                    : 'bi-heart-pulse'
                            }`}
                        ></i>
                    </div>

                    <div className={s.TreatmentContent}>

                        <p className={s.TreatmentText}>
                            {item.text}
                        </p>

                        {item.checked &&
                            item.checked_by && (
                                <p
                                    className={
                                        s.CheckedBy
                                    }
                                >
                                    <i className="bi bi-person-check"></i>

                                    {doctorFullName(
                                        item
                                            .checked_by
                                            .doctor
                                    ) ||
                                        item
                                            .checked_by
                                            .username}{' '}
                                    tomonidan
                                    bajarilgan
                                </p>
                            )}

                    </div>
                </div>

                <div
                    className={`${s.TreatmentAction} ${
                        isChecked
                            ? s.TreatmentActionDone
                            : ''
                    }`}
                >

                    {isChecked ? (
                        <div className={s.DoneBadge}>
                            <i className="bi bi-check-lg"></i>
                            Bajarildi
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={isToggling}
                            className={
                                s.MarkDoneBtn
                            }
                            onClick={() =>
                                handleToggleItem(
                                    plan.id,
                                    day.id,
                                    item
                                )
                            }
                        >
                            {isToggling ? (
                                <>
                                    <i className="bi bi-arrow-repeat"></i>
                                    Saqlanmoqda...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2"></i>
                                    Bajarildi
                                </>
                            )}
                        </button>
                    )}

                </div>

            </div>
        )
    }

    return (
        <div className={s.DetailPage}>

            {/* =================================================
                BACK
            ================================================= */}

            <button
                type="button"
                className={s.BackBtn}
                onClick={() =>
                    navigate('/nurse-progress-patients')
                }
            >
                <i className="bi bi-arrow-left"></i>

                Bemorlar ro'yxatiga qaytish
            </button>


            {/* =================================================
                PATIENT BANNER
            ================================================= */}

            <div className={s.Banner}>

                <div className={s.BannerLeft}>

                    <div className={s.Avatar}>
                        {patient.first_name?.[0] ||
                            '?'}
                    </div>

                    <div>

                        <h1>
                            {patient.first_name}{' '}
                            {patient.last_name}{' '}
                            {patient.middle_name}
                        </h1>

                        <p>
                            {calcAge(
                                patient.date_of_birth
                            )}{' '}
                            yosh
                            <span> · </span>

                            {patient.gender ===
                            'erkak'
                                ? 'Erkak'
                                : 'Ayol'}
                        </p>

                    </div>

                </div>

                <span
                    className={
                        s.StatusPill
                    }
                >
                    Jarayondagi bemor
                </span>

            </div>


            {/* =================================================
                PATIENT INFO
            ================================================= */}

            <div className={s.InfoRow}>

                <div className={s.InfoCard}>

                    <i className="bi bi-telephone"></i>

                    <div>
                        <span>
                            Telefon
                        </span>

                        <p>
                            {patient.contact_number ||
                                '—'}
                        </p>
                    </div>

                </div>


                <div className={s.InfoCard}>

                    <i className="bi bi-geo-alt"></i>

                    <div>
                        <span>
                            Manzil
                        </span>

                        <p>
                            {patient.address ||
                                '—'}
                        </p>
                    </div>

                </div>


                <div className={s.InfoCard}>

                    <i className="bi bi-calendar3"></i>

                    <div>
                        <span>
                            Tug'ilgan sana
                        </span>

                        <DateTimeFormatter
                            className={s.datt}
                            date={
                                patient.date_of_birth
                            }
                            format="date"
                        />
                    </div>

                </div>


                <div className={s.InfoCard}>

                    <i className="bi bi-clock-history"></i>

                    <div>
                        <span>
                            Ro'yxatdan o'tgan sana
                        </span>

                        <DateTimeFormatter
                            className={s.datt}
                            date={
                                patient.create_date
                            }
                        />
                    </div>

                </div>

            </div>


            {/* =================================================
                NURSE INFO
            ================================================= */}

            <div className={s.NurseNotice}>

                <div
                    className={
                        s.NurseNoticeIcon
                    }
                >
                    <i className="bi bi-info-circle"></i>
                </div>

                <div>
                    <strong>
                        Hamshira uchun
                    </strong>

                    <p>
                        Quyidagi ro'yxatda bemorga
                        shifokor tomonidan biriktirilgan
                        muolajalar ko'rsatilgan.
                        Muolajani bajarganingizdan so'ng
                        <b> "Bajarildi"</b> tugmasini bosing.
                    </p>
                </div>

            </div>


            {/* =================================================
                TREATMENTS
            ================================================= */}

            <div className={s.PlansSection}>

                <div className={s.SectionHeader}>

                    <div>
                        <h2>
                            Biriktirilgan muolajalar
                        </h2>

                        <p>
                            Bemor uchun bajarilishi
                            kerak bo'lgan muolajalar
                        </p>
                    </div>

                    <div
                        className={
                            s.TotalPlans
                        }
                    >
                        <i className="bi bi-clipboard2-pulse"></i>

                        {treatmentHistory.length}{' '}
                        ta reja
                    </div>

                </div>


                {historyLoading && (
                    <div className={s.Empty}>
                        <div
                            className={
                                s.SmallSpinner
                            }
                        ></div>

                        <span>
                            Muolajalar yuklanmoqda...
                        </span>
                    </div>
                )}


                {historyError && (
                    <div
                        className={
                            s.FormError
                        }
                    >
                        <i className="bi bi-exclamation-circle-fill"></i>

                        {historyError}
                    </div>
                )}


                {!historyLoading &&
                    treatmentHistory.length ===
                    0 && (
                        <div
                            className={
                                s.EmptyBox
                            }
                        >
                            <div
                                className={
                                    s.EmptyIcon
                                }
                            >
                                <i className="bi bi-clipboard-x"></i>
                            </div>

                            <h3>
                                Muolajalar topilmadi
                            </h3>

                            <p>
                                Bu bemor uchun hozircha
                                bajarilishi kerak bo'lgan
                                muolajalar mavjud emas.
                            </p>
                        </div>
                    )}


                <div
                    className={
                        s.PlansList
                    }
                >

                    {treatmentHistory.map(
                        (plan) => {
                            const statusInfo =
                                getPlanStatus(
                                    plan
                                )

                            const progress =
                                Math.round(
                                    plan.progress ??
                                    0
                                )

                            const totalItems =
                                plan.days?.reduce(
                                    (
                                        total,
                                        day
                                    ) =>
                                        total +
                                        (day.items
                                            ?.length ||
                                            0),
                                    0
                                ) || 0

                            const completedItems =
                                plan.days?.reduce(
                                    (
                                        total,
                                        day
                                    ) =>
                                        total +
                                        (day.items
                                            ?.filter(
                                                (
                                                    item
                                                ) =>
                                                    item.checked
                                            )
                                            .length ||
                                            0),
                                    0
                                ) || 0

                            return (
                                <div
                                    key={
                                        plan.id
                                    }
                                    className={
                                        s.PlanCard
                                    }
                                >

                                    {/* PLAN HEADER */}

                                    <div
                                        className={
                                            s.PlanHeader
                                        }
                                    >

                                        <div
                                            className={
                                                s.PlanHeaderInfo
                                            }
                                        >

                                            <div
                                                className={
                                                    s.PlanTitleRow
                                                }
                                            >

                                                <h3>
                                                    {
                                                        plan.diagnosis
                                                    }
                                                </h3>

                                                <span
                                                    className={`${s.PlanStatusBadge} ${s[statusInfo.className]}`}
                                                >
                                                    {
                                                        statusInfo.label
                                                    }
                                                </span>

                                            </div>


                                            <div
                                                className={
                                                    s.PlanMeta
                                                }
                                            >

                                                {plan.complaint && (
                                                    <span>
                                                        <i className="bi bi-chat-square-text"></i>

                                                        {
                                                            plan.complaint
                                                        }
                                                    </span>
                                                )}

                                                {plan.created_at && (
                                                    <span>
                                                        <i className="bi bi-calendar-plus"></i>

                                                        Boshlangan:{' '}

                                                        <DateTimeFormatter
                                                            date={
                                                                plan.created_at
                                                            }
                                                            format="date"
                                                        />
                                                    </span>
                                                )}

                                            </div>

                                        </div>


                                        {/* PROGRESS */}

                                        <div
                                            className={
                                                s.PlanProgress
                                            }
                                        >

                                            <div
                                                className={
                                                    s.ProgressInfo
                                                }
                                            >
                                                <span>
                                                    Bajarilish
                                                </span>

                                                <strong>
                                                    {
                                                        progress
                                                    }%
                                                </strong>
                                            </div>

                                            <div
                                                className={
                                                    s.ProgressBarTrack
                                                }
                                            >
                                                <div
                                                    className={
                                                        s.ProgressBarFill
                                                    }
                                                    style={{
                                                        width: `${progress}%`,
                                                    }}
                                                />
                                            </div>

                                            <small>
                                                {
                                                    completedItems
                                                }{' '}
                                                /{' '}
                                                {
                                                    totalItems
                                                }{' '}
                                                muolaja
                                            </small>

                                        </div>

                                    </div>


                                    {/* DAYS */}

                                    <div
                                        className={
                                            s.PlanDaysGrid
                                        }
                                    >

                                        {plan.days?.map(
                                            (
                                                day,
                                                dayIndex
                                            ) => {

                                                const dayTotal =
                                                    day.items
                                                        ?.length ||
                                                    0

                                                const dayCompleted =
                                                    day.items?.filter(
                                                        (
                                                            item
                                                        ) =>
                                                            item.checked
                                                    )
                                                        .length ||
                                                    0

                                                const dayFinished =
                                                    dayTotal >
                                                        0 &&
                                                    dayCompleted ===
                                                        dayTotal

                                                return (
                                                    <div
                                                        key={
                                                            day.id
                                                        }
                                                        className={`${s.PlanDayCard} ${
                                                            dayFinished
                                                                ? s.PlanDayFinished
                                                                : ''
                                                        }`}
                                                    >

                                                        <div
                                                            className={
                                                                s.DayHeader
                                                            }
                                                        >

                                                            <span
                                                                className={
                                                                    s.DayBadge
                                                                }
                                                            >
                                                                {day.day_number ||
                                                                    dayIndex +
                                                                    1}
                                                                -kun
                                                            </span>

                                                            <span
                                                                className={
                                                                    s.DayProgress
                                                                }
                                                            >
                                                                {
                                                                    dayCompleted
                                                                }
                                                                /
                                                                {
                                                                    dayTotal
                                                                }
                                                            </span>

                                                        </div>


                                                        <ul
                                                            className={
                                                                s.CheckList
                                                            }
                                                        >

                                                            {day.items?.map(
                                                                (
                                                                    item
                                                                ) => (
                                                                    <li
                                                                        key={
                                                                            item.id
                                                                        }
                                                                    >
                                                                        {renderItem(
                                                                            plan,
                                                                            day,
                                                                            item
                                                                        )}
                                                                    </li>
                                                                )
                                                            )}

                                                        </ul>


                                                        {day.note && (
                                                            <div
                                                                className={
                                                                    s.PlanDayNote
                                                                }
                                                            >
                                                                <i className="bi bi-info-circle"></i>

                                                                {
                                                                    day.note
                                                                }
                                                            </div>
                                                        )}

                                                    </div>
                                                )
                                            }
                                        )}

                                    </div>

                                </div>
                            )
                        }
                    )}

                </div>

            </div>


            {/* =================================================
                CONFIRM MODAL
            ================================================= */}

            <Modal
                isOpen={
                    !!confirmItem
                }
                onClose={() =>
                    setConfirmItem(
                        null
                    )
                }
            >

                {confirmItem && (
                    <div
                        className={
                            s.ConfirmBox
                        }
                    >

                        <div
                            className={
                                s.ConfirmIcon
                            }
                        >
                            <i className="bi bi-check-circle"></i>
                        </div>

                        <h2>
                            Muolajani bajarildi deb
                            belgilash
                        </h2>

                        <p>
                            Quyidagi muolaja bajarilganini
                            tasdiqlaysizmi?
                        </p>

                        <div
                            className={
                                s.ConfirmTask
                            }
                        >
                            {
                                confirmItem.item
                                    .text
                            }
                        </div>

                        <p
                            className={
                                s.ConfirmWarning
                            }
                        >
                            <i className="bi bi-info-circle"></i>

                            Tasdiqlangandan so'ng ushbu
                            muolajani qayta o'zgartirib
                            bo'lmaydi.
                        </p>

                        <div
                            className={
                                s.ConfirmButtons
                            }
                        >

                            <button
                                type="button"
                                className={
                                    s.CancelBtn
                                }
                                onClick={() =>
                                    setConfirmItem(
                                        null
                                    )
                                }
                            >
                                Bekor qilish
                            </button>

                            <button
                                type="button"
                                className={
                                    s.ConfirmBtn
                                }
                                onClick={
                                    confirmMarkItemDone
                                }
                            >
                                <i className="bi bi-check-lg"></i>

                                Tasdiqlash
                            </button>

                        </div>

                    </div>
                )}

            </Modal>

        </div>
    )
}

export default NurseProgressPatientDetail