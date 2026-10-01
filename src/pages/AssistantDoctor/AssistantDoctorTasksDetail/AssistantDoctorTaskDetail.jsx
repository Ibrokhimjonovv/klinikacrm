import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import s from './AssistantDoctorTaskDetail.module.scss';
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';
import ImageZoomViewer from '../../../components/shared/ImageZoomViewer/ImageZoomViewer';

// ============================================================
// Yordamchi funksiyalar
// ============================================================

const calcAge = (birthDate) => {
    if (!birthDate) return '?';
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const formatSum = (n) =>
    Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const DAY_STATUS_LABELS = {
    WAITING: { label: 'Kutilmoqda', className: 'waiting' },
    IN_PROGRESS: { label: 'Jarayonda', className: 'in_progress' },
    DONE: { label: 'Bajarildi', className: 'completed' },
    CANCELLED: { label: 'Bekor qilindi', className: 'cancelled' },
};

const authHeaders = (token, json = true) => ({
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

// Fayl rasmmi yoki yo'qmi — kengaytma bo'yicha aniqlash
const isImage = (url) => {
    if (!url) return false;
    const clean = String(url).split('?')[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(clean);
};

// ============================================================
// Komponent
// ============================================================

const AssistantDoctorPTaskDetail = () => {
    const navigate = useNavigate();
    const { planId, serviceId } = useParams();

    const [patient, setPatient] = useState(null);
    const [service, setService] = useState(null);
    const [plan, setPlan] = useState(null);
    const [days, setDays] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeDayId, setActiveDayId] = useState(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingComment, setPendingComment] = useState('');
    const [saving, setSaving] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState(null);

    const openImageModal = (url) => {
        setModalImage(url);
        setModalOpen(true);
    };

    const closeImageModal = () => {
        setModalOpen(false);
        setModalImage(null);
    };

    const activeDay = days.find((d) => d.id === activeDayId) || null;

    // ------------------------------------------------------------
    // Fetch
    // ------------------------------------------------------------
    const fetchDetail = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('hospital_access');
            const res = await fetch(
                `${api}/doctor/my-treatment-services/${planId}/${serviceId}/`,
                {
                    method: 'GET',
                    headers: authHeaders(token),
                }
            );

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            setPatient(data.patient_detail || null);
            setService(data.service_detail || null);
            setPlan(data.treatment_plan_detail || null);

            // Kunlarni UI shakliga moslash
            const normalizedDays = (data.days || []).map((d, index) => ({
                id: d.id,
                dayNumber: d.day_detail?.day_number ?? index + 1,
                status: d.status,
                note: d.note || '',
                services: d.service_detail
                    ? [
                        {
                            id: d.service_detail.id,
                            name: d.service_detail.name,
                            price: d.service_detail.price,
                            duration: null,
                        },
                    ]
                    : [],
                file: d.result_file_url
                    ? String(d.result_file_url).split('/').pop()
                    : null,
                fileUrl: d.result_file_url || null,   // ← to'liq URL/path
                resultText: d.result_text || null,    // ← natija matni
                comment: d.note || null,
                raw: d,
            }));

            setDays(normalizedDays);
        } catch (err) {
            console.error('Detail fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (planId && serviceId) fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planId, serviceId]);

    // ------------------------------------------------------------
    // Modal
    // ------------------------------------------------------------
    const openDay = (day) => {
        setActiveDayId(day.id);
        setPendingFile(null);
        setPendingComment(day.resultText || day.note || '');
    };

    const closeDrawer = () => setActiveDayId(null);

    // ------------------------------------------------------------
    // Vazifani boshlash — PATCH status=IN_PROGRESS
    // ------------------------------------------------------------
    const handleStartDay = async () => {
        if (!activeDay) return;

        try {
            setSaving(true);
            const token = localStorage.getItem('hospital_access');

            const res = await fetch(
                `${api}/doctor/treatment-day-services/${activeDay.id}/`,
                {
                    method: 'PATCH',
                    headers: authHeaders(token), // JSON Content-Type
                    body: JSON.stringify({ status: 'IN_PROGRESS' }),
                }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const updated = await res.json().catch(() => null);

            // Lokal yangilash
            setDays((prev) =>
                prev.map((d) =>
                    d.id === activeDay.id
                        ? {
                            ...d,
                            status: updated?.status || 'IN_PROGRESS',
                        }
                        : d
                )
            );
        } catch (err) {
            console.error('Start error:', err);
            alert('Vazifani boshlashda xatolik: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ------------------------------------------------------------
    // Vazifani yakunlash — fayl + izoh + status=DONE
    // ------------------------------------------------------------
    const handleFinishDay = async () => {
        if (!activeDay) return;

        try {
            setSaving(true);
            const token = localStorage.getItem('hospital_access');

            const formData = new FormData();
            if (pendingComment.trim()) formData.append('note', pendingComment.trim());
            if (pendingComment.trim()) formData.append('result_text', pendingComment.trim());
            if (pendingFile) formData.append('result_file', pendingFile);
            formData.append('status', 'DONE');

            const res = await fetch(
                `${api}/doctor/treatment-day-services/${activeDay.id}/`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        // Content-Type ni qo'lda qo'ymang — FormData o'zi qo'yadi
                    },
                    body: formData,
                }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const updated = await res.json().catch(() => null);

            setDays((prev) =>
                prev.map((d) =>
                    d.id === activeDay.id
                        ? {
                            ...d,
                            status: updated?.status || 'DONE',
                            note: updated?.note ?? pendingComment.trim() ?? d.note,
                            file:
                                updated?.result_file_url
                                    ? String(updated.result_file_url).split('/').pop()
                                    : pendingFile?.name || d.file,
                            fileUrl:
                                updated?.result_file_url ||
                                (pendingFile ? URL.createObjectURL(pendingFile) : d.fileUrl),
                            resultText:
                                updated?.result_text ??
                                pendingComment.trim() ??
                                d.resultText,
                            comment:
                                updated?.result_text ??
                                pendingComment.trim() ??
                                d.comment,
                        }
                        : d
                )
            );

            closeDrawer();
        } catch (err) {
            console.error('Finish error:', err);
            alert('Yakunlashda xatolik: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ------------------------------------------------------------
    // Status pill
    // ------------------------------------------------------------
    const renderStatusPill = (status) => {
        const st = DAY_STATUS_LABELS[status] || DAY_STATUS_LABELS.WAITING;
        return (
            <span className={`${s.StatusTag} ${s[st.className] || ''}`}>
                {st.label}
            </span>
        );
    };

    // ------------------------------------------------------------
    // Loading / Error
    // ------------------------------------------------------------
    if (loading) {
        return (
            <div className={s.DetailPage}>
                <p>Ma'lumotlar yuklanmoqda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={s.DetailPage}>
                <p>Xatolik: {error}</p>
            </div>
        );
    }

    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------
    return (
        <div className={s.DetailPage}>
            <button
                className={s.BackBtn}
                onClick={() => navigate(-1)}
            >
                <i className="bi bi-arrow-left"></i> Bemorlar ro'yxatiga qaytish
            </button>

            {/* BANNER */}
            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>
                        {patient?.first_name?.[0] || '?'}
                    </div>
                    <div>
                        <h1>
                            {patient?.first_name} {patient?.last_name}{' '}
                            {patient?.middle_name}
                        </h1>
                        <p>
                            {calcAge(patient?.date_of_birth)} yosh ·{' '}
                            {patient?.gender === 'ayol' ? 'Ayol' : 'Erkak'}
                        </p>
                    </div>
                </div>
                <span className={s.StatusPill}>Davolanmoqda</span>
            </div>

            {/* INFO CARDS */}
            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div>
                        <span>Telefon</span>
                        <p>{patient?.contact_number || '-'}</p>
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-clipboard2-pulse"></i>
                    <div>
                        <span>Xizmat</span>
                        <p>{service?.name || "Ko'rsatilmagan"}</p>
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-cash-coin"></i>
                    <div>
                        <span>Narxi</span>
                        <p>{formatSum(service?.price)}</p>
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Jami kunlar</span>
                        <p>{days.length} kun</p>
                    </div>
                </div>
            </div>

            {/* KUNLIK REJA */}
            <div className={s.DiagRequestsSection}>
                <h2>Kunlik reja</h2>

                <div className={s.PlanDaysGrid}>
                    {days.map((day) => (
                        <button
                            key={day.id}
                            type="button"
                            className={s.DayCardBtn}
                            onClick={() => openDay(day)}
                        >
                            <div className={s.DayCardTop}>
                                <span className={s.DayBadge}>
                                    {day.dayNumber}-kun
                                </span>
                                {renderStatusPill(day.status)}
                            </div>

                            {day.services.map((sv) => (
                                <div key={sv.id} className={s.DayServiceMini}>
                                    <i className="bi bi-clipboard2-pulse"></i>
                                    <span className="name">{sv.name}</span>
                                    {sv.price != null && (
                                        <span className="duration">
                                            {formatSum(sv.price)}
                                        </span>
                                    )}
                                </div>
                            ))}

                            <div className={s.DayCardFoot}>
                                <span>Batafsil ko'rish</span>
                                <i className="bi bi-chevron-right"></i>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* MODAL */}
            <Modal isOpen={!!activeDay} onClose={closeDrawer}>
                {activeDay && (
                    <>
                        <div className={s.DrawerHead}>
                            <div>
                                <h2>{activeDay.dayNumber}-kun</h2>
                                <p>
                                    {activeDay.services
                                        .map((sv) => sv.name)
                                        .join(', ')}
                                </p>
                            </div>
                        </div>

                        <div className={s.DrawerBody}>
                            <p className={s.DrawerSectionTitle}>
                                Xizmatlar
                            </p>
                            <div className={s.ServiceMiniList}>
                                {activeDay.services.map((sv) => (
                                    <div
                                        key={sv.id}
                                        className={s.ServiceMiniItem}
                                    >
                                        <i className="bi bi-clipboard2-pulse"></i>
                                        <span className="name">
                                            {sv.name}
                                        </span>
                                        <span className="meta">
                                            {formatSum(sv.price)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <p className={s.DrawerSectionTitle}>
                                Vazifa holati
                            </p>
                            <div className={s.StatusBox}>
                                <div className={s.StatusBoxTop}>
                                    <span className="label">
                                        <i className="bi bi-clipboard2-data"></i>{' '}
                                        Joriy holat
                                    </span>
                                    {renderStatusPill(activeDay.status)}
                                </div>
                            </div>

                            {activeDay.status === 'WAITING' && (
                                <>
                                    <p className={s.FormInfo}>
                                        <i className="bi bi-info-circle-fill"></i>
                                        Natija kiritishni boshlash uchun avval
                                        vazifani boshlang.
                                    </p>
                                    <button
                                        type="button"
                                        className={s.SubmitPlanBtn}
                                        onClick={handleStartDay}
                                        disabled={saving}
                                    >
                                        <i className="bi bi-play-fill"></i>{' '}
                                        {saving
                                            ? 'Yuklanmoqda...'
                                            : 'Vazifani boshlash'}
                                    </button>
                                </>
                            )}

                            {activeDay.status === 'IN_PROGRESS' && (
                                <>
                                    <div className={s.Field}>
                                        <label>Natija fayli</label>
                                        <label className={s.FileInputLabel}>
                                            <span>
                                                <i className="bi bi-paperclip"></i>
                                                {pendingFile
                                                    ? pendingFile.name
                                                    : 'Faylni tanlang (rasm yoki PDF)'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf,application/pdf"
                                                onChange={(e) =>
                                                    setPendingFile(
                                                        e.target.files?.[0] ||
                                                        null
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>

                                    <div className={s.Field}>
                                        <label>Izoh</label>
                                        <textarea
                                            rows={4}
                                            placeholder="Bajarilgan ish, kuzatuv, tavsiyalar..."
                                            value={pendingComment}
                                            onChange={(e) =>
                                                setPendingComment(e.target.value)
                                            }
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className={s.FinishBtn}
                                        onClick={handleFinishDay}
                                        disabled={saving}
                                    >
                                        <i className="bi bi-check-lg"></i>{' '}
                                        {saving
                                            ? 'Saqlanmoqda...'
                                            : 'Yakunlash'}
                                    </button>
                                </>
                            )}

                            {activeDay.status === 'DONE' && (
                                <div className={s.DoneBox}>
                                    <i className="bi bi-check-circle-fill"></i>
                                    <div>
                                        <strong>Vazifa yakunlangan</strong>
                                        Natija va izoh saqlangan.

                                        {/* Natija matni */}
                                        {(activeDay.resultText || activeDay.comment) && (
                                            <div className={s.CommentPreview}>
                                                {activeDay.resultText || activeDay.comment}
                                            </div>
                                        )}

                                        {/* Fayl preview */}
                                        {activeDay.fileUrl && (
                                            <div className={s.FilePreviewBox}>
                                                <button
                                                    type="button"
                                                    className={s.FileViewBtn}
                                                    onClick={() =>
                                                        isImage(activeDay.fileUrl)
                                                            ? openImageModal(activeDay.fileUrl)
                                                            : window.open(
                                                                activeDay.fileUrl,
                                                                '_blank',
                                                                'noopener,noreferrer'
                                                            )
                                                    }
                                                >
                                                    <i
                                                        className={
                                                            isImage(activeDay.fileUrl)
                                                                ? 'bi bi-image'
                                                                : 'bi bi-file-earmark-pdf'
                                                        }
                                                    ></i>
                                                    <span>{"Natija faylini ko'rish"}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={modalOpen}
                onClose={closeImageModal}
                fullWidth
            >
                {modalImage && (
                    <ImageZoomViewer
                        src={modalImage}
                        alt="Natija fayli"
                    />
                )}
            </Modal>
        </div>
    );
};

export default AssistantDoctorPTaskDetail;