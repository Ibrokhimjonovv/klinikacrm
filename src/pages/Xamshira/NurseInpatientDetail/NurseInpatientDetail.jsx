import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './NurseInpatientDetail.module.scss';
import { api } from '../../../App';

const calcAge = (birthDate) => {
    if (!birthDate) return '?';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const STATUS_LABELS = {
    WAITING: 'Kutilmoqda',
    IN_PROGRESS: 'Jarayonda',
    DONE: 'Bajarildi',
};

const STATUS_KEY = {
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
};

const authHeaders = (token, json = false) => ({
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const NurseInpatientDetail = () => {
    const { id } = useParams(); // patient id
    const navigate = useNavigate();

    const [patient, setPatient] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [checkedIds, setCheckedIds] = useState(new Set());
    const [startingId, setStartingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const getToken = () => localStorage.getItem('hospital_access');

    // ------------------------------------------------------------
    // FETCH — /nurse/treatments/ dan shu bemorga tegishli
    // itemlarni ajratib olamiz (backendda alohida "bitta bemor"
    // endpointi yo'q).
    // ------------------------------------------------------------

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${api}/nurse/treatments/`, {
                    method: 'GET',
                    headers: authHeaders(getToken()),
                    signal: controller.signal,
                });

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                const data = await res.json();
                const all = [
                    ...(data.waiting || []),
                    ...(data.in_progress || []),
                    ...(data.completed || []),
                ];

                const patientItems = all
                    .filter(item => String(item.patient?.id) === String(id))
                    .sort((a, b) => a.day_number - b.day_number);

                if (patientItems.length > 0) {
                    setPatient(patientItems[0].patient);
                }

                setItems(patientItems);

                // Endi bajarilgan/ boshlanmagan bo'lib qolgan
                // itemlarni belgilangan ro'yxatdan olib tashlaymiz
                setCheckedIds(prev => {
                    const next = new Set();
                    patientItems.forEach(it => {
                        if (it.status === 'IN_PROGRESS' && prev.has(it.id)) next.add(it.id);
                    });
                    return next;
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Bemor muolajalarini olishda xatolik:", err);
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [id, reloadKey]);

    // ------------------------------------------------------------
    // BOSHLASH — bitta kun uchun
    // ------------------------------------------------------------

    const handleStart = async (itemId) => {
        try {
            setStartingId(itemId);
            setFormError('');

            const res = await fetch(`${api}/nurse/treatments/${itemId}/start/`, {
                method: 'POST',
                headers: authHeaders(getToken()),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`);

            setReloadKey(k => k + 1);
        } catch (err) {
            console.error('Muolajani boshlashda xatolik:', err);
            setFormError(err.message || 'Muolajani boshlashda xatolik yuz berdi');
        } finally {
            setStartingId(null);
        }
    };

    // ------------------------------------------------------------
    // CHECKBOX — faqat IN_PROGRESS itemlar belgilanadi
    // ------------------------------------------------------------

    const toggleCheck = (item) => {
        if (item.status !== 'IN_PROGRESS') return;

        setCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(item.id)) next.delete(item.id);
            else next.add(item.id);
            return next;
        });
    };

    // ------------------------------------------------------------
    // SAQLASH — belgilangan kunlarni yakunlaydi (complete)
    // ------------------------------------------------------------

    const handleSaveChecked = async () => {
        if (checkedIds.size === 0) return;

        setFormError('');
        setFormSuccess('');

        try {
            setSaving(true);

            const results = await Promise.all(
                Array.from(checkedIds).map(itemId =>
                    fetch(`${api}/nurse/treatments/${itemId}/complete/`, {
                        method: 'POST',
                        headers: authHeaders(getToken()),
                    }).then(async (res) => {
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data.detail || `HTTP error! status: ${res.status}`);
                        return data;
                    })
                )
            );

            setFormSuccess(`${results.length} ta kun yakunlandi`);
            setCheckedIds(new Set());
            setReloadKey(k => k + 1);
        } catch (err) {
            console.error('Saqlashda xatolik:', err);
            setFormError(err.message || 'Belgilangan kunlarni saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    // ------------------------------------------------------------
    // RENDER STATES
    // ------------------------------------------------------------

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

    if (!patient) {
        return (
            <div className={s.State}>
                <p>Bemor topilmadi</p>
            </div>
        );
    }

    const doneCount = items.filter(i => i.status === 'DONE').length;
    const doctorsLabel = Array.from(
        new Map(
            items.flatMap(i => i.doctors || []).map(d => [d.id, `${d.first_name || ''} ${d.last_name || ''}`.trim()])
        ).values()
    ).join(', ') || "Ko'rsatilmagan";

    return (
        <div className={s.DetailPage}>
            {/* BACK */}
            <button className={s.BackBtn} onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left"></i>
                Bemorlar ro'yxatiga qaytish
            </button>

            {/* PATIENT BANNER */}
            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>{patient.first_name?.charAt(0) || '?'}</div>
                    <div>
                        <h1>
                            {patient.first_name} {patient.last_name} {patient.middle_name}
                        </h1>
                        <p>
                            {calcAge(patient.date_of_birth)} yosh
                            {' · '}
                            {patient.gender === 'erkak' ? 'Erkak' : 'Ayol'}
                        </p>
                    </div>
                </div>

                <span className={s.StatusPill}>
                    {doneCount}/{items.length} kun bajarildi
                </span>
            </div>

            {/* PATIENT INFO */}
            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div>
                        <span>Telefon</span>
                        <p>{patient.contact_number || '-'}</p>
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
                    <i className="bi bi-calendar2-week"></i>
                    <div>
                        <span>Jami kunlar</span>
                        <p>{items.length} kun</p>
                    </div>
                </div>
            </div>

            {/* DAYS CHECKLIST */}
            <div className={s.DaysSection}>
                <h2>Muolaja kunlari</h2>

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

                <div className={s.DaysList}>
                    {items.map(item => {
                        const isDone = item.status === 'DONE';
                        const isProgress = item.status === 'IN_PROGRESS';
                        const isWaiting = item.status === 'WAITING';
                        const isChecked = checkedIds.has(item.id);

                        return (
                            <div
                                key={item.id}
                                className={`${s.DayItem} ${isDone ? s.DayItemDone : ''} ${isChecked ? s.DayItemChecked : ''}`}
                            >
                                <div className={s.DayItemLeft}>
                                    <button
                                        type="button"
                                        className={`${s.Checkbox} ${isChecked || isDone ? s.CheckboxOn : ''} ${!isProgress ? s.CheckboxDisabled : ''}`}
                                        disabled={!isProgress}
                                        onClick={() => toggleCheck(item)}
                                        aria-label="Kunni belgilash"
                                    >
                                        {(isChecked || isDone) && <i className="bi bi-check-lg"></i>}
                                    </button>

                                    <div>
                                        <p className={s.DayBadge}>Kun {item.day_number}</p>
                                        <p className={s.DayText}>{item.treatment || "Ko'rsatilmagan"}</p>
                                    </div>
                                </div>

                                <div className={s.DayItemRight}>
                                    <span className={`${s.StatusBadge} ${s[STATUS_KEY[item.status] || '']}`}>
                                        {STATUS_LABELS[item.status] || item.status}
                                    </span>

                                    {isWaiting && (
                                        <button
                                            type="button"
                                            className={s.ActionBtn}
                                            disabled={startingId === item.id}
                                            onClick={() => handleStart(item.id)}
                                        >
                                            {startingId === item.id ? '...' : 'Boshlash'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SAVE BAR */}
            {checkedIds.size > 0 && (
                <div className={s.SaveBar}>
                    <p>{checkedIds.size} ta kun belgilandi</p>
                    <button
                        type="button"
                        className={s.SaveBtn}
                        disabled={saving}
                        onClick={handleSaveChecked}
                    >
                        {saving ? 'Saqlanmoqda...' : 'Saqlash va yakunlash'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NurseInpatientDetail;