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

// ------------------------------------------------------------
// Kun statusi — shu kundagi muolajalar statuslaridan hisoblanadi
// ------------------------------------------------------------
const getDayStatus = (treatments) => {
    const statuses = treatments.map(t => t.status);
    if (statuses.length === 0) return 'WAITING';
    if (statuses.every(st => st === 'DONE')) return 'DONE';
    if (statuses.every(st => st === 'CANCELLED')) return 'CANCELLED';
    if (statuses.some(st => st === 'IN_PROGRESS')) return 'IN_PROGRESS';
    if (statuses.some(st => st === 'DONE')) return 'IN_PROGRESS'; // qisman bajarilgan
    return 'WAITING';
};

// ------------------------------------------------------------
// day_id bo'yicha guruhlash: 1 kun = 1 karta, ichida muolajalar
// ------------------------------------------------------------
const groupByDay = (planItems) => {
    const map = new Map();

    planItems.forEach(item => {
        if (!map.has(item.day_id)) {
            map.set(item.day_id, {
                day_id: item.day_id,
                day_number: item.day_number,
                treatments: [],
            });
        }
        map.get(item.day_id).treatments.push(item);
    });

    return Array.from(map.values())
        .map(day => {
            const treatments = day.treatments.slice().sort((a, b) => a.id - b.id);
            return { ...day, treatments, status: getDayStatus(treatments) };
        })
        .sort((a, b) => a.day_number - b.day_number);
};

// ============================================================
// Komponent
// ============================================================

const NurseInpatientDetail = () => {
    // Route'dan to'g'ridan-to'g'ri REJA id (treatment_plan_id) olinadi
    const { planId } = useParams();
    const navigate = useNavigate();

    const [patient, setPatient] = useState(null);
    const [diagnosis, setDiagnosis] = useState(null);
    const [doctorsLabel, setDoctorsLabel] = useState("Ko'rsatilmagan");
    const [dayItems, setDayItems] = useState([]); // guruhlangan kunlar

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [activeDayId, setActiveDayId] = useState(null);

    // Har bir muolaja uchun alohida qoralama: { [treatmentId]: { file, comment } }
    const [drafts, setDrafts] = useState({});
    // Hozir so'rov ketayotgan muolaja id si
    const [savingId, setSavingId] = useState(null);
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
    // FETCH — /nurse/treatments/ dan faqat shu REJAga tegishli
    // yozuvlarni olib, kun bo'yicha guruhlaymiz.
    // ------------------------------------------------------------
    const fetchDetail = async (silent = false) => {
        try {
            // Qayta yuklashda (start/complete dan keyin) butun sahifani
            // "yuklanmoqda" ga almashtirmaymiz — modal yopilib ketmasligi uchun.
            if (!silent) setLoading(true);
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
            setDayItems(groupByDay(planItems));
        } catch (err) {
            console.error('Reja tafsilotlarini olishda xatolik:', err);
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail(reloadKey > 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planId, reloadKey]);

    const activeDay = dayItems.find((d) => d.day_id === activeDayId) || null;

    // ------------------------------------------------------------
    // Qoralama (draft) yordamchilari
    // ------------------------------------------------------------
    const getDraft = (t) => {
        const d = drafts[t.id];
        return {
            file: d?.file || null,
            comment: d?.comment !== undefined ? d.comment : (t.result_text || t.note || ''),
        };
    };

    const setDraft = (id, patch) =>
        setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    const clearDraft = (id) =>
        setDrafts(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });

    // ------------------------------------------------------------
    // Modal ochish / yopish
    // ------------------------------------------------------------
    const openDay = (day) => {
        setFormError('');
        setActiveDayId(day.day_id);
    };

    const closeDrawer = () => setActiveDayId(null);

    // ------------------------------------------------------------
    // Muolajani boshlash — id = MUOLAJA id si (masalan 85, 86, 87)
    // ------------------------------------------------------------
    const handleStart = async (treatmentId) => {
        try {
            setSavingId(treatmentId);
            setFormError('');

            const res = await fetch(`${api}/nurse/treatments/${treatmentId}/start/`, {
                method: 'POST',
                headers: authHeaders(getToken(), false),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`);

            setReloadKey(k => k + 1);
        } catch (err) {
            console.error('Muolajani boshlashda xatolik:', err);
            setFormError(err.message || 'Muolajani boshlashda xatolik yuz berdi');
        } finally {
            setSavingId(null);
        }
    };

    // ------------------------------------------------------------
    // Muolajani yakunlash — fayl + izoh
    // ⚠️ TAXMIN: /nurse/treatments/{id}/complete/ endpointi FormData
    // (note/result_text/result_file) qabul qiladi deb faraz qilindi.
    // Backend boshqacha kutsa, shu joyni to'g'irlash kerak bo'ladi.
    // ------------------------------------------------------------
    const handleFinish = async (treatment) => {
        const { file, comment } = getDraft(treatment);

        try {
            setSavingId(treatment.id);
            setFormError('');

            const formData = new FormData();
            if (comment.trim()) formData.append('note', comment.trim());
            if (comment.trim()) formData.append('result_text', comment.trim());
            if (file) formData.append('result_file', file);

            const res = await fetch(`${api}/nurse/treatments/${treatment.id}/complete/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`);

            clearDraft(treatment.id);
            setReloadKey(k => k + 1);
        } catch (err) {
            console.error('Yakunlashda xatolik:', err);
            setFormError(err.message || 'Muolajani yakunlashda xatolik yuz berdi');
        } finally {
            setSavingId(null);
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
    // Modal ichidagi bitta muolaja bloki
    // ------------------------------------------------------------
    const renderTreatmentBlock = (t) => {
        const draft = getDraft(t);
        const isSaving = savingId === t.id;
        const anySaving = savingId !== null;

        return (
            <div key={t.id} className={s.StatusBox} style={{ marginBottom: 16 }}>
                <div className={s.StatusBoxTop}>
                    <span className="label">
                        <i className="bi bi-clipboard2-pulse"></i>{' '}
                        <strong>{t.treatment || "Ko'rsatilmagan"}</strong>
                    </span>
                    {renderStatusPill(t.status)}
                </div>

                {t.status === 'WAITING' && (
                    <>
                        <p className={s.FormInfo}>
                            <i className="bi bi-info-circle-fill"></i>
                            Natija kiritish uchun avval muolajani boshlang.
                        </p>
                        <button
                            type="button"
                            className={s.SubmitPlanBtn}
                            onClick={() => handleStart(t.id)}
                            disabled={anySaving}
                        >
                            <i className="bi bi-play-fill"></i>{' '}
                            {isSaving ? 'Yuklanmoqda...' : 'Muolajani boshlash'}
                        </button>
                    </>
                )}

                {t.status === 'IN_PROGRESS' && (
                    <>
                        <div className={s.Field}>
                            <label>Natija fayli</label>
                            <label className={s.FileInputLabel}>
                                <span>
                                    <i className="bi bi-paperclip"></i>
                                    {draft.file
                                        ? draft.file.name
                                        : 'Faylni tanlang (rasm yoki PDF)'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    onChange={(e) =>
                                        setDraft(t.id, { file: e.target.files?.[0] || null })
                                    }
                                />
                            </label>
                        </div>

                        <div className={s.Field}>
                            <label>Izoh</label>
                            <textarea
                                rows={4}
                                placeholder="Bajarilgan ish, kuzatuv, tavsiyalar..."
                                value={draft.comment}
                                onChange={(e) => setDraft(t.id, { comment: e.target.value })}
                            />
                        </div>

                        <button
                            type="button"
                            className={s.FinishBtn}
                            onClick={() => handleFinish(t)}
                            disabled={anySaving}
                        >
                            <i className="bi bi-check-lg"></i>{' '}
                            {isSaving ? 'Saqlanmoqda...' : 'Yakunlash'}
                        </button>
                    </>
                )}

                {t.status === 'DONE' && (
                    <div className={s.DoneBox}>
                        <i className="bi bi-check-circle-fill"></i>
                        <div>
                            <strong>Muolaja yakunlangan</strong>
                            Natija va izoh saqlangan.

                            {(t.result_text || t.note) && (
                                <div className={s.CommentPreview}>
                                    {t.result_text || t.note}
                                </div>
                            )}

                            {t.result_file_url && (
                                <div className={s.FilePreviewBox}>
                                    <button
                                        type="button"
                                        className={s.FileViewBtn}
                                        onClick={() =>
                                            isImage(t.result_file_url)
                                                ? openImageModal(t.result_file_url)
                                                : window.open(
                                                    t.result_file_url,
                                                    '_blank',
                                                    'noopener,noreferrer'
                                                )
                                        }
                                    >
                                        <i
                                            className={
                                                isImage(t.result_file_url)
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

    if (error && !patient) {
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

    const doneDays = dayItems.filter(d => d.status === 'DONE').length;
    const totalTreatments = dayItems.reduce((sum, d) => sum + d.treatments.length, 0);
    const doneTreatments = dayItems.reduce(
        (sum, d) => sum + d.treatments.filter(t => t.status === 'DONE').length,
        0
    );

    // ------------------------------------------------------------
    // Render
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
                    {doneDays}/{dayItems.length} kun bajarildi
                    {' · '}
                    {doneTreatments}/{totalTreatments} muolaja
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

            {formError && !activeDay && (
                <p className={s.FormError}>
                    <i className="bi bi-exclamation-circle-fill"></i> {formError}
                </p>
            )}

            {/* KUNLIK REJA — har bir kun uchun 1 ta karta */}
            <div className={s.DiagRequestsSection}>
                <h2>Kunlik reja</h2>

                <div className={s.PlanDaysGrid}>
                    {dayItems.map((day) => (
                        <button
                            key={day.day_id}
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

                            {day.treatments.map((t) => (
                                <div key={t.id} className={s.DayServiceMini}>
                                    <i className="bi bi-clipboard2-pulse"></i>
                                    <span className="name">{t.treatment || "Ko'rsatilmagan"}</span>
                                    <span style={{ marginLeft: 'auto' }}>
                                        {renderStatusPill(t.status)}
                                    </span>
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

            {/* MODAL — tanlangan kunning barcha muolajalari */}
            <Modal isOpen={!!activeDay} onClose={closeDrawer}>
                {activeDay && (
                    <>
                        <div className={s.DrawerHead}>
                            <div>
                                <h2>{activeDay.day_number}-kun</h2>
                                <p>{activeDay.treatments.length} ta muolaja</p>
                            </div>
                        </div>

                        <div className={s.DrawerBody}>
                            <p className={s.DrawerSectionTitle}>
                                Muolajalar holati
                            </p>

                            {formError && (
                                <p className={s.FormError}>
                                    <i className="bi bi-exclamation-circle-fill"></i> {formError}
                                </p>
                            )}

                            {activeDay.treatments.map(renderTreatmentBlock)}
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