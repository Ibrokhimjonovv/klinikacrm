import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import s from './AssistantDoctorExcaminationDetail.module.scss';
import { api } from '../../../App';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const TASKS_PATH = '/doctor/my-direct-tasks';

const calcAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const formatSum = (n) =>
    Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const genderLabel = (g) => (g === 'erkak' ? 'Erkak' : g === 'ayol' ? 'Ayol' : '-');

const DIAG_STATUS_LABELS = {
    REQUESTED: 'Kutilmoqda',
    ASSIGNED: 'Biriktirildi',
    IN_PROGRESS: 'Jarayonda',
    COMPLETED: 'Yakunlandi',
    NO_SHOW: 'Kelmagan',
    CANCELLED: 'Bekor qilingan',
};

const authHeaders = (token, json = false) => ({
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

// Bemor: obyekt bo'lsa olamiz. `patient: null` kelsa — null.
const pickPatient = (t) => {
    if (t.patient_detail) return t.patient_detail;
    if (t.patient && typeof t.patient === 'object') return t.patient;
    return t.medical_visit?.patient || null;
};

// Backend javobi (direct task) shu yerda bitta joyda moslanadi
const normalizeTask = (t) => {
    const patient = pickPatient(t) || {};

    return {
        id: t.id,
        status: t.status,
        priority: t.priority,
        isDirect: !!t.is_direct_service,
        doctorNote: t.doctor_note || '',
        requestedAt: t.requested_at,
        startedAt: t.started_at,
        completedAt: t.completed_at,
        serviceName: t.service?.name || t.service_name || "Ko'rsatilmagan",
        serviceDescription: t.service?.description || '',
        servicePrice: t.service?.price,
        serviceDuration: t.service?.duration_minutes,
        complaintText: t.medical_visit?.complaint || t.complaint || '',
        requestedByName:
            t.requested_by_detail?.full_name ||
            t.requested_by_detail?.username ||
            t.requested_by?.full_name ||
            t.requested_by?.username ||
            '',
        hasPatient: !!(patient.first_name || patient.last_name),
        patient: {
            firstName: patient.first_name || '',
            lastName: patient.last_name || '',
            middleName: patient.middle_name || '',
            dateOfBirth: patient.birth_date || patient.date_of_birth,
            gender: patient.gender,
            contactNumber: patient.contact_number,
            address: patient.address,
        },
        resultText: t.result?.result_text || '',
        resultFileUrl: t.result?.result_file || null,
    };
};

const AssistantDoctorExcaminationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [resultText, setResultText] = useState('');
    const [resultFile, setResultFile] = useState(null);

    const [starting, setStarting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [completing, setCompleting] = useState(false);

    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const getToken = () => localStorage.getItem('hospital_access');

    useEffect(() => {
        const fetchTask = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${api}${TASKS_PATH}/${id}/`, {
                    method: 'GET',
                    headers: authHeaders(getToken()),
                });

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                const data = await res.json();
                const normalized = normalizeTask(data);
                setTask(normalized);
                setResultText(normalized.resultText);
            } catch (err) {
                console.error('Vazifani olishda xatolik:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTask();
    }, [id, reloadKey]);

    const isLocked = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(task?.status);
    const isPending = ['REQUESTED', 'ASSIGNED'].includes(task?.status);

    const handleStart = async () => {
        try {
            setStarting(true);
            setFormError('');

            const res = await fetch(`${api}/doctor/my-tasks/${id}/start/`, {
                method: 'PATCH',
                headers: authHeaders(getToken(), true),
            });

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            setReloadKey((k) => k + 1);
        } catch (err) {
            console.error('Vazifani boshlashda xatolik:', err);
            setFormError('Vazifani boshlashda xatolik yuz berdi');
        } finally {
            setStarting(false);
        }
    };

    const buildResultFormData = () => {
        const formData = new FormData();
        formData.append('result_text', resultText || '');
        if (resultFile) formData.append('result_file', resultFile);
        return formData;
    };

    const handleSaveResult = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        try {
            setSaving(true);

            const res = await fetch(`${api}${TASKS_PATH}/${id}/result/`, {
                method: 'POST',
                headers: authHeaders(getToken()),
                body: buildResultFormData(),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP error! status: ${res.status}`);
            }

            setFormSuccess('Natija saqlandi');
            setReloadKey((k) => k + 1);
        } catch (err) {
            console.error('Natijani saqlashda xatolik:', err);
            setFormError(err.message || 'Natijani saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        setFormError('');
        setFormSuccess('');

        if (!resultText && !resultFile && !task?.resultFileUrl) {
            setFormError('Yakunlashdan oldin natija matni yoki faylini kiriting');
            return;
        }

        try {
            setCompleting(true);

            const res = await fetch(`${api}/doctor/my-tasks/${id}/complete/`, {
                method: 'POST',
                headers: authHeaders(getToken()),
                body: buildResultFormData(),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP error! status: ${res.status}`);
            }

            setFormSuccess('Vazifa muvaffaqiyatli yakunlandi');
            setReloadKey((k) => k + 1);
        } catch (err) {
            console.error('Vazifani yakunlashda xatolik:', err);
            setFormError(err.message || 'Vazifani yakunlashda xatolik yuz berdi');
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <div className={s.State}>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={s.State}>
                <p>Xatolik: {error}</p>
            </div>
        );
    }

    if (!task) return null;

    const { patient } = task;
    const age = calcAge(patient.dateOfBirth);

    return (
        <div className={s.DetailPage}>
            {/* BACK */}
            <button className={s.BackBtn} onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left"></i>
                Ko'rikdagi bemorlarga qaytish
            </button>

            {/* PATIENT BANNER */}
            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>{patient.firstName?.charAt(0) || '?'}</div>
                    <div>
                        <h1>
                            {task.hasPatient
                                ? `${patient.firstName} ${patient.lastName} ${patient.middleName}`
                                : "Bemor ko'rsatilmagan"}
                        </h1>
                        <p>
                            {task.hasPatient
                                ? `${age !== null ? `${age} yosh` : '-'} · ${genderLabel(patient.gender)}`
                                : "Bemor ma'lumotlari serverdan kelmadi"}
                        </p>
                    </div>
                </div>

                <span className={s.StatusPill}>
                    {DIAG_STATUS_LABELS[task.status] || task.status}
                </span>
            </div>

            {/* INFO */}
            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div>
                        <span>Telefon</span>
                        <p>{patient.contactNumber || '-'}</p>
                    </div>
                </div>

                {/* <div className={s.InfoCard}>
                    <i className="bi bi-geo-alt"></i>
                    <div>
                        <span>Manzil</span>
                        <p>{patient.address || '-'}</p>
                    </div>
                </div> */}

                <div className={s.InfoCard}>
                    <i className="bi bi-clipboard2-pulse"></i>
                    <div>
                        <span>Xizmat</span>
                        <p>{task.serviceName}</p>
                    </div>
                </div>

                <div className={s.InfoCard}>
                    <i className="bi bi-clock-history"></i>
                    <div>
                        <span>So'ralgan sana</span>
                        {task.requestedAt ? (
                            <DateTimeFormatter className={s.datt} date={task.requestedAt} format="datetime" />
                        ) : (
                            <p>-</p>
                        )}
                    </div>
                </div>
            </div>

            {/* TASK CARD */}
            <div className={s.DiagRequestsSection}>
                <h2>Vazifa tafsilotlari</h2>

                <div className={s.DiagRequestCard}>
                    <div className={s.DiagRequestTop}>
                        <p className={s.DiagRequestComplaint}>
                            {task.complaintText || task.serviceDescription || task.serviceName}
                        </p>
                    </div>

                    <div className={s.DiagTypesBadges}>
                        <span className={s.DiagTypeBadge}>{task.serviceName}</span>
                        {task.isDirect && (
                            <span className={s.DiagTypeBadge}>Bevosita xizmat</span>
                        )}
                    </div>

                    <div className={s.DiagRequestMeta}>
                        <span>
                            <i className="bi bi-person-badge"></i>
                            {task.requestedByName ? `Yuborgan: ${task.requestedByName}` : "Yuboruvchi noma'lum"}
                        </span>

                        {task.servicePrice != null && (
                            <span>
                                <i className="bi bi-cash-stack"></i>
                                Narxi: {formatSum(task.servicePrice)}
                            </span>
                        )}

                        {task.serviceDuration != null && (
                            <span>
                                <i className="bi bi-hourglass-split"></i>
                                Davomiyligi: {task.serviceDuration} daqiqa
                            </span>
                        )}

                        {task.startedAt && (
                            <span>
                                <i className="bi bi-play-circle"></i>
                                Boshlandi: <DateTimeFormatter date={task.startedAt} format="datetime" />
                            </span>
                        )}

                        {task.completedAt && (
                            <span>
                                <i className="bi bi-check-circle"></i>
                                Yakunlandi: <DateTimeFormatter date={task.completedAt} format="datetime" />
                            </span>
                        )}
                    </div>

                    {task.doctorNote && <p className={s.DiagRequestNote}>{task.doctorNote}</p>}

                    <div className={s.DiagStatusRow}>
                        <label>Holati</label>
                        <span className={`${s.DiagStatusBadge} ${s[task.status?.toLowerCase()] || ''}`}>
                            {DIAG_STATUS_LABELS[task.status] || task.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* PENDING — START */}
            {isPending && (
                <div className={s.PlanForm}>
                    <p className={s.FormInfo}>
                        <i className="bi bi-info-circle-fill"></i>
                        Natija kiritishni boshlash uchun avval vazifani boshlang.
                    </p>

                    {formError && (
                        <p className={s.FormError}>
                            <i className="bi bi-exclamation-circle-fill"></i>
                            {formError}
                        </p>
                    )}

                    <button
                        type="button"
                        className={s.SubmitPlanBtn}
                        disabled={starting}
                        onClick={handleStart}
                    >
                        {starting ? 'Boshlanmoqda...' : 'Vazifani boshlash'}
                    </button>
                </div>
            )}

            {/* IN PROGRESS / COMPLETED — RESULT FORM */}
            {!isPending && (
                <div className={s.PlanForm}>
                    <div className={s.PlanFormHead}>
                        <div>
                            <h2>Natija</h2>
                            <p className={s.PlanFormSub}>
                                {isLocked ? (
                                    <>Vazifa yakunlangan, natija faqat ko'rish uchun.</>
                                ) : (
                                    <>
                                        Xizmat: <span>{task.serviceName}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {isLocked && (
                        <p className={s.FormInfo}>
                            <i className="bi bi-info-circle-fill"></i>
                            Bu vazifa allaqachon yakunlangan. Quyida saqlangan natija ko'rsatilgan.
                        </p>
                    )}

                    <form onSubmit={handleSaveResult}>
                        <div className={s.Field}>
                            <label>Natija matni</label>
                            <textarea
                                rows={4}
                                placeholder="Tekshiruv natijasi, xulosa..."
                                value={resultText}
                                onChange={(e) => setResultText(e.target.value)}
                                disabled={isLocked || saving || completing}
                            />
                        </div>

                        <div className={s.Field}>
                            <label>Natija fayli</label>

                            {!isLocked && (
                                <label className={s.FileInputLabel}>
                                    <span>
                                        <i className="bi bi-paperclip"></i>
                                        {resultFile ? resultFile.name : 'Faylni tanlang (ixtiyoriy)'}
                                    </span>
                                    <input
                                        type="file"
                                        onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                                        disabled={saving || completing}
                                    />
                                </label>
                            )}

                            {task.resultFileUrl && (
                                <a
                                    href={task.resultFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={s.FieldHint}
                                >
                                    <i className="bi bi-download"></i> Yuklangan faylni ko'rish
                                </a>
                            )}
                        </div>

                        {formError && (
                            <p className={s.FormError}>
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {formError}
                            </p>
                        )}

                        {formSuccess && (
                            <p className={s.FormSuccess}>
                                <i className="bi bi-check-circle-fill"></i>
                                {formSuccess}
                            </p>
                        )}

                        {!isLocked ? (
                            <div className={s.ModeSwitch}>
                                <button type="submit" disabled={saving || completing}>
                                    {saving ? 'Saqlanmoqda...' : 'Natijani saqlash'}
                                </button>

                                <button
                                    type="button"
                                    className={s.ModeActive}
                                    disabled={saving || completing}
                                    onClick={handleComplete}
                                >
                                    {completing ? 'Yakunlanmoqda...' : 'Vazifani yakunlash'}
                                </button>
                            </div>
                        ) : (
                            <div className={s.SentBadge}>
                                <i className="bi bi-check-circle-fill"></i>
                                {DIAG_STATUS_LABELS[task.status] || task.status}
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
};

export default AssistantDoctorExcaminationDetail;