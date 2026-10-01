import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './NurseInpatientDetail.module.scss';
import { api } from '../../../App';
import Modal from '../../../components/Modal/Modal';
import ImageZoomViewer from '../../../components/shared/ImageZoomViewer/ImageZoomViewer';

// ============================================================
// Yordamchi funksiyalar
// ============================================================

const calcAge = (birthDate) => {
    if (!birthDate) return '?';
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

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

const isImage = (url) => {
    if (!url) return false;
    const clean = String(url).split('?')[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(clean);
};

const getPlanDiagnosis = (planItems) => {
    const first = planItems?.[0] || {};
    return (
        first.diagnosis ||
        first.plan?.diagnosis ||
        first.treatment_plan?.diagnosis ||
        first.treatment_plan_diagnosis ||
        null
    );
};

const getDoctorsLabel = (planItems) => {
    const label = Array.from(
        new Map(
            (planItems || [])
                .flatMap(i => i.doctors || [])
                .map(d => [d.id, `${d.first_name || ''} ${d.last_name || ''}`.trim()])
        ).values()
    ).join(', ');
    return label || "Ko'rsatilmagan";
};

// ============================================================
// Komponent
// ============================================================

const NurseInpatientDetail = () => {
    // ✅ TUZATILDI: endi bemor id emas, to'g'ridan-to'g'ri REJA id
    // (treatment_plan_id) route'dan olinadi — shu sabab bu yerda
    // "reja tanlash" ekraniga umuman ehtiyoj qolmaydi.
    const { planId } = useParams();
    const navigate = useNavigate();

    const [patient, setPatient] = useState(null);
    const [diagnosis, setDiagnosis] = useState(null);
    const [doctorsLabel, setDoctorsLabel] = useState("Ko'rsatilmagan");
    const [dayItems, setDayItems] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [activeDayId, setActiveDayId] = useState(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingComment, setPendingComment] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

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

    const getToken = () => localStorage.getItem('hospital_access');

    // ------------------------------------------------------------
    // FETCH — /nurse/treatments/ dan faqat shu REJAga (planId)
    // tegishli kunlarni ajratib olamiz.
    // ------------------------------------------------------------
    const fetchDetail = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${api}/nurse/treatments/`, {
                method: 'GET',
                headers: authHeaders(getToken(), false),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            const all = [
                ...(data.waiting || []),
                ...(data.in_progress || []),
                ...(data.completed || []),
            ];

            const planItems = all.filter(
                item => String(item.treatment_plan_id) === String(planId)
            );

            if (planItems.length > 0) {
                setPatient(planItems[0].patient);
            }

            setDiagnosis(getPlanDiagnosis(planItems));
            setDoctorsLabel(getDoctorsLabel(planItems));
            setDayItems(planItems.slice().sort((a, b) => a.day_number - b.day_number));
        } catch (err) {
            console.error('Reja tafsilotlarini olishda xatolik:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planId, reloadKey]);

    const activeDay = dayItems.find((d) => d.id === activeDayId) || null;

    // ------------------------------------------------------------
    // Modal ochish / yopish — assistant doktor bilan bir xil oqim
    // ------------------------------------------------------------
    const openDay = (day) => {
        setFormError('');
        setActiveDayId(day.id);
        setPendingFile(null);
        setPendingComment(day.result_text || day.note || '');
    };

    const closeDrawer = () => setActiveDayId(null);

    // ------------------------------------------------------------
    // Vazifani boshlash
    // ------------------------------------------------------------
    const handleStartDay = async () => {
        if (!activeDay) return;

        try {
            setSaving(true);
            setFormError('');

            const res = await fetch(`${api}/nurse/treatments/${activeDay.id}/start/`, {
                method: 'POST',
                headers: authHeaders(getToken(), false),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`);

            setReloadKey(k => k + 1);
        } catch (err) {
            console.error('Vazifani boshlashda xatolik:', err);
            setFormError(err.message || 'Vazifani boshlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    // ------------------------------------------------------------
    // Vazifani yakunlash — fayl + izoh
    // ⚠️ TAXMIN: /nurse/treatments/{id}/complete/ endpointi FormData
    // (note/result_text/result_file) qabul qiladi deb faraz qilindi.
    // Backend boshqacha kutsa, shu joyni to'g'irlash kerak bo'ladi.
    // ------------------------------------------------------------
    const handleFinishDay = async () => {
        if (!activeDay) return;

        try {
            setSaving(true);
            setFormError('');

            const formData = new FormData();
            if (pendingComment.trim()) formData.append('note', pendingComment.trim());
            if (pendingComment.trim()) formData.append('result_text', pendingComment.trim());
            if (pendingFile) formData.append('result_file', pendingFile);

            const res = await fetch(`${api}/nurse/treatments/${activeDay.id}/complete/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`);

            setReloadKey(k => k + 1);
            closeDrawer();
        } catch (err) {
            console.error('Yakunlashda xatolik:', err);
            setFormError(err.message || 'Kunni yakunlashda xatolik yuz berdi');
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

    if (!patient) {
        return (
            <div className={s.DetailPage}>
                <p>Reja topilmadi</p>
            </div>
        );
    }

    const doneCount = dayItems.filter(i => i.status === 'DONE').length;

    // ------------------------------------------------------------
    // Render — assistant doktor bilan bir xil struktura
    // ------------------------------------------------------------
    return (
        <div className={s.DetailPage}>
            <button className={s.BackBtn} onClick={() => navigate(-1)}>
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
                            {patient?.first_name} {patient?.last_name} {patient?.middle_name}
                        </h1>
                        <p>
                            {calcAge(patient?.date_of_birth)} yosh ·{' '}
                            {patient?.gender === 'ayol' ? 'Ayol' : 'Erkak'}
                        </p>
                    </div>
                </div>
                <span className={s.StatusPill}>
                    {doneCount}/{dayItems.length} kun bajarildi
                </span>
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
                        <span>Tashxis</span>
                        <p>{diagnosis || `№${planId}-reja`}</p>
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-person-badge"></i>
                    <div>
                        <span>Doktor(lar)</span>
                        <p>{doctorsLabel}</p>
                    </div>
                </div>
                <div className={s.InfoCard}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Jami kunlar</span>
                        <p>{dayItems.length} kun</p>
                    </div>
                </div>
            </div>

            {formError && (
                <p className={s.FormError}>
                    <i className="bi bi-exclamation-circle-fill"></i> {formError}
                </p>
            )}

            {/* KUNLIK REJA */}
            <div className={s.DiagRequestsSection}>
                <h2>Kunlik reja</h2>

                <div className={s.PlanDaysGrid}>
                    {dayItems.map((day) => (
                        <button
                            key={day.id}
                            type="button"
                            className={s.DayCardBtn}
                            onClick={() => openDay(day)}
                        >
                            <div className={s.DayCardTop}>
                                <span className={s.DayBadge}>
                                    {day.day_number}-kun
                                </span>
                                {renderStatusPill(day.status)}
                            </div>

                            <div className={s.DayServiceMini}>
                                <i className="bi bi-clipboard2-pulse"></i>
                                <span className="name">{day.treatment || "Ko'rsatilmagan"}</span>
                            </div>

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
                                <h2>{activeDay.day_number}-kun</h2>
                                <p>{activeDay.treatment || "Ko'rsatilmagan"}</p>
                            </div>
                        </div>

                        <div className={s.DrawerBody}>
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
                                        Natija kiritishni boshlash uchun avval vazifani boshlang.
                                    </p>
                                    <button
                                        type="button"
                                        className={s.SubmitPlanBtn}
                                        onClick={handleStartDay}
                                        disabled={saving}
                                    >
                                        <i className="bi bi-play-fill"></i>{' '}
                                        {saving ? 'Yuklanmoqda...' : 'Vazifani boshlash'}
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
                                                    setPendingFile(e.target.files?.[0] || null)
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
                                            onChange={(e) => setPendingComment(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className={s.FinishBtn}
                                        onClick={handleFinishDay}
                                        disabled={saving}
                                    >
                                        <i className="bi bi-check-lg"></i>{' '}
                                        {saving ? 'Saqlanmoqda...' : 'Yakunlash'}
                                    </button>
                                </>
                            )}

                            {activeDay.status === 'DONE' && (
                                <div className={s.DoneBox}>
                                    <i className="bi bi-check-circle-fill"></i>
                                    <div>
                                        <strong>Vazifa yakunlangan</strong>
                                        Natija va izoh saqlangan.

                                        {(activeDay.result_text || activeDay.note) && (
                                            <div className={s.CommentPreview}>
                                                {activeDay.result_text || activeDay.note}
                                            </div>
                                        )}

                                        {activeDay.result_file_url && (
                                            <div className={s.FilePreviewBox}>
                                                <button
                                                    type="button"
                                                    className={s.FileViewBtn}
                                                    onClick={() =>
                                                        isImage(activeDay.result_file_url)
                                                            ? openImageModal(activeDay.result_file_url)
                                                            : window.open(
                                                                activeDay.result_file_url,
                                                                '_blank',
                                                                'noopener,noreferrer'
                                                            )
                                                    }
                                                >
                                                    <i
                                                        className={
                                                            isImage(activeDay.result_file_url)
                                                                ? 'bi bi-image'
                                                                : 'bi bi-file-earmark-pdf'
                                                        }
                                                    ></i>
                                                    <span>Natija faylini ko'rish</span>
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

            <Modal isOpen={modalOpen} onClose={closeImageModal} fullWidth>
                {modalImage && (
                    <ImageZoomViewer src={modalImage} alt="Natija fayli" />
                )}
            </Modal>
        </div>
    );
};

export default NurseInpatientDetail;