import React, { useState, useEffect } from 'react';
import s from './NurseProgressPatients.module.scss';
import { api } from '../../../../App';
import { useToast } from '../../../../context/ToastContext';
import { useSearchParams } from 'react-router-dom';

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const getDoctorName = (doctor) => {
    if (!doctor) return '—';
    return [doctor.first_name, doctor.middle_name, doctor.last_name].filter(Boolean).join(' ');
};

const getStatus = (status) => {
    switch (status) {
        case 'DONE':
        case 'COMPLETED':
            return { label: 'Yakunlangan', className: s.done };
        case 'IN_PROGRESS':
            return { label: 'Jarayonda', className: s.active };
        case 'WAITING':
            return { label: 'Kutilmoqda', className: s.waiting };
        default:
            return { label: status || 'Noma’lum', className: s.waiting };
    }
};

const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatSum = (n) => Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const NurseProgressPatients = () => {
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // URL'dagi ?id=... qiymatini boshlang'ich holat sifatida olamiz
    const [complaintId, setComplaintId] = useState(searchParams.get('id') || '');
    const [searched, setSearched] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [visit, setVisit] = useState(null);

    const [isExpanded, setIsExpanded] = useState(false);
    const [togglingItemId, setTogglingItemId] = useState(null);

    // Qidiruv logikasini alohida funksiyaga chiqaramiz — ID parametr sifatida keladi
    const performSearch = async (idValue) => {
        if (!idValue.trim()) return;

        setSearched(true);
        setLoading(true);
        setError(null);
        setVisit(null);
        setIsExpanded(false);

        try {
            const token = localStorage.getItem('hospital_access');
            const res = await fetch(`${api}/get/medical/visit/${idValue.trim()}/`, {
                method: 'GET',
                headers: authHeaders(token),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setVisit(data);
        } catch (err) {
            console.error('Shikoyat bo\'yicha ma\'lumot olishda xatolik:', err);
            setError("Bu ID raqamiga tegishli davolash rejasi topilmadi");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!complaintId.trim()) return;

        // MUHIM: URL'ga ?id=... qo'shamiz — sahifa yangilansa ham saqlanadi
        setSearchParams({ id: complaintId.trim() });
        performSearch(complaintId);
    };

    const clearSearch = () => {
        setComplaintId('');
        setSearched(false);
        setVisit(null);
        setError(null);
        setIsExpanded(false);
        setSearchParams({}); // URL'dan ?id= ni olib tashlaydi
    };

    // Sahifa yuklanganda (yoki URL'dagi ?id= o'zgarganda) — avtomatik qidirish
    useEffect(() => {
        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            setComplaintId(idFromUrl);
            performSearch(idFromUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // faqat komponent birinchi marta yuklanganda ishga tushadi

    // Bandni bajarildi/bajarilmadi deb belgilash
    const handleToggleItem = async (dayId, item, dayIndex, dayEnabled) => {
        if (item.checked) return;

        if (!dayEnabled) {
            showToast("Avvalgi kunning barcha bandlarini yakunlang", "warning");
            return;
        }

        const newChecked = !item.checked;
        setTogglingItemId(item.id);

        // Optimistik yangilash
        setVisit(prev => ({
            ...prev,
            treatment_plan: {
                ...prev.treatment_plan,
                days: prev.treatment_plan.days.map(d =>
                    d.id !== dayId ? d : {
                        ...d,
                        items: d.items.map(it => it.id === item.id ? { ...it, checked: newChecked } : it)
                    }
                )
            }
        }));

        try {
            const token = localStorage.getItem('hospital_access');
            const res = await fetch(`${api}/treatmentItem/${item.id}/check/`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ checked: newChecked }),
            });
            if (!res.ok) throw new Error('check failed');
        } catch (err) {
            console.error('Belgilashda xatolik:', err);
            // Xatolik bo'lsa — orqaga qaytarish
            setVisit(prev => ({
                ...prev,
                treatment_plan: {
                    ...prev.treatment_plan,
                    days: prev.treatment_plan.days.map(d =>
                        d.id !== dayId ? d : {
                            ...d,
                            items: d.items.map(it => it.id === item.id ? { ...it, checked: !newChecked } : it)
                        }
                    )
                }
            }));
        } finally {
            setTogglingItemId(null);
        }
    };

    const canOpenDay = (days, currentIndex) => {
        if (currentIndex === 0) return true;

        const previousDay = days[currentIndex - 1];

        return previousDay.items.every(
            item => item.checked
        );
    };

    const plan = visit?.treatment_plan || null;
    const doctor = visit?.doctors?.[0];

    return (
        <div className={s.PatientsPage}>

            {/* HEADER */}
            <div className={s.TopRow}>
                <div>
                    <h1>Bemor muolajalari</h1>
                    <p>Shikoyat ID raqami orqali davolash rejasini qidiring</p>
                </div>
            </div>

            {/* SEARCH */}
            <form className={s.SearchForm} onSubmit={handleSearch}>
                <div className={s.SearchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Shikoyat ID sini kiriting..."
                        value={complaintId}
                        onChange={(e) => {
                            setComplaintId(e.target.value);
                            setSearched(false);
                        }}
                    />
                    {complaintId && (
                        <button type="button" className={s.ClearBtn} onClick={clearSearch}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                </div>

                <button type="submit" className={s.SearchBtn} disabled={!complaintId.trim() || loading}>
                    <i className="bi bi-search"></i>
                    {loading ? 'Qidirilmoqda...' : 'Qidirish'}
                </button>
            </form>

            {/* SEARCH HINT */}
            {!searched && (
                <div className={s.SearchHint}>
                    <div className={s.HintIcon}>
                        <i className="bi bi-person-vcard"></i>
                    </div>
                    <div>
                        <h3>Shikoyat ID sini kiriting</h3>
                        <p>
                            Bemorning shikoyat ID raqamini kiritsangiz,
                            unga tegishli davolash rejasi shu yerda chiqadi.
                        </p>
                    </div>
                </div>
            )}

            {/* LOADING */}
            {searched && loading && (
                <div className={s.Empty}>
                    <p>Yuklanmoqda...</p>
                </div>
            )}

            {/* EMPTY / ERROR RESULT */}
            {searched && !loading && (error || !visit) && (
                <div className={s.Empty}>
                    <div className={s.EmptyIcon}>
                        <i className="bi bi-search"></i>
                    </div>
                    <h3>Davolash rejasi topilmadi</h3>
                    <p>
                        <strong>{complaintId}</strong> ID raqamiga tegishli davolash rejasi mavjud emas.
                    </p>
                </div>
            )}

            {/* RESULT */}
            {searched && !loading && visit && (
                <div className={s.ResultsSection}>

                    <div className={s.ResultsHeader}>
                        <div>
                            <h2>Davolash rejasi</h2>
                            <p>Shikoyat bo'yicha topilgan natija</p>
                        </div>

                        <span className={s.SearchIdBadge}>
                            <i className="bi bi-hash"></i>
                            {complaintId}
                        </span>
                    </div>

                    <div className={s.ResultsList}>
                        <div className={s.TreatmentCard}>

                            <div
                                className={s.CardClickable}
                                onClick={() => setIsExpanded(prev => !prev)}
                            >
                                {/* CARD TOP */}
                                <div className={s.CardTop}>
                                    <div className={s.PlanId}>
                                        <span>Reja</span>
                                        <strong>#{plan?.id ?? '—'}</strong>
                                    </div>

                                    <span className={`${s.StatusBadge} ${getStatus(visit.status).className}`}>
                                        <span className={s.StatusDot} />
                                        {getStatus(visit.status).label}
                                    </span>
                                </div>

                                {/* DIAGNOSIS */}
                                <div className={s.Diagnosis}>
                                    <span className={s.Label}>
                                        <i className="bi bi-clipboard2-pulse"></i>
                                        Tashxis
                                    </span>
                                    <h3>{plan?.diagnosis || "Tashxis qo'yilmagan"}</h3>
                                </div>

                                {/* COMPLAINT */}
                                <div className={s.Complaint}>
                                    <div>
                                        <span className={s.Label}>
                                            <i className="bi bi-chat-left-text"></i>
                                            Shikoyat
                                        </span>
                                        <p>{visit.complaint}</p>
                                    </div>
                                    <span className={s.ComplaintId}>
                                        ID: {visit.id}
                                    </span>
                                </div>

                                {/* PATIENT */}
                                <div className={s.Complaint}>
                                    <div>
                                        <span className={s.Label}>
                                            <i className="bi bi-person"></i>
                                            Bemor
                                        </span>
                                        <p>
                                            {visit.patient?.first_name} {visit.patient?.last_name} {visit.patient?.middle_name}
                                        </p>
                                    </div>
                                    <span className={s.ComplaintId}>
                                        {visit.patient?.contact_number}
                                    </span>
                                </div>

                                {/* FOOTER */}
                                <div className={s.CardFooter}>
                                    <div className={s.Doctor}>
                                        <div className={s.DoctorIcon}>
                                            <i className="bi bi-person-badge"></i>
                                        </div>
                                        <div>
                                            <span>Shifokor</span>
                                            <strong>{getDoctorName(doctor)}</strong>
                                        </div>
                                    </div>

                                    <div className={s.Date}>
                                        <i className="bi bi-calendar3"></i>
                                        {formatDate(visit.created_at)}
                                    </div>

                                    {plan && (
                                        <div className={s.OpenIcon}>
                                            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* KENGAYTIRILGAN QISM — kunlik checklist + dorilar */}
                            {isExpanded && plan && (
                                <div className={s.PlanDetail}>
                                    {(!plan.days || plan.days.length === 0) && (
                                        <p className={s.DetailEmpty}>Kunlik ma'lumot topilmadi</p>
                                    )}

                                    {plan.days?.length > 0 && (
                                        <div className={s.DaysGrid}>
                                            {plan.days.map((day, dayIndex) => {
                                                const dayMedTotal = (day.medicines || []).reduce(
                                                    (sum, m) => sum + (Number(m.total_price) || 0), 0
                                                );

                                                const dayEnabled = canOpenDay(plan.days, dayIndex);

                                                return (
                                                    <div key={day.id}
                                                        className={`${s.DayCard} ${!dayEnabled ? s.DayDisabled : ''
                                                            }`}>
                                                        <span className={s.DayBadge}>
                                                            {day.day_number || dayIndex + 1}-kun
                                                        </span>

                                                        <ul className={s.CheckList}>
                                                            {day.items?.map((item) => (
                                                                <li key={item.id}>
                                                                    <label
                                                                        className={s.CheckboxRow}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            if (!dayEnabled && !item.checked) {
                                                                                e.preventDefault()
                                                                                showToast("Avvalgi kunning barcha bandlarini yakunlang", "warning")
                                                                            }
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.checked}
                                                                            disabled={item.checked || togglingItemId === item.id}
                                                                            onChange={() => handleToggleItem(day.id, item, dayIndex, dayEnabled)}
                                                                        />
                                                                        <span className={item.checked ? s.CheckedText : ''}>
                                                                            {item.text}
                                                                        </span>
                                                                    </label>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        {day.medicines?.length > 0 && (
                                                            <div className={s.MedicinesBlock}>
                                                                <p className={s.MedicinesTitle}>
                                                                    <i className="bi bi-capsule"></i> Dori-darmonlar
                                                                </p>
                                                                <ul className={s.MedicinesList}>
                                                                    {day.medicines.map((m) => (
                                                                        <li key={m.id}>
                                                                            <span className={s.MedName}>{m.medicine_name}</span>
                                                                            <span className={s.MedQty}>
                                                                                {m.quantity} dona × {formatSum(m.unit_price)}
                                                                            </span>
                                                                            <span className={s.MedTotal}>{formatSum(m.total_price)}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                <div className={s.MedicinesDayTotal}>
                                                                    <span>Kunlik dori narxi</span>
                                                                    <span>{formatSum(dayMedTotal)}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {day.note && <p className={s.DayNote}>{day.note}</p>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NurseProgressPatients;