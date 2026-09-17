import React, { useState, useEffect } from 'react';
import s from './NursePaidPatients.module.scss';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../App';
import { useToast } from '../../../context/ToastContext';

const authHeaders = (token, json = true) => ({
    'Authorization': `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
})

const formatSum = (n) => Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPatientName = (patient) => {
    if (!patient) return '—';
    return [patient.first_name, patient.last_name, patient.middle_name].filter(Boolean).join(' ');
};

const isNumeric = (v) => /^\d+$/.test(v.trim());

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Naqd' },
    { value: 'CARD', label: 'Karta' },
    { value: 'TRANSFER', label: "O'tkazma" },
];

const NursePaidPatients = () => {
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // URL'dagi ?id=... qiymatini boshlang'ich holat sifatida olamiz
    const [query, setQuery] = useState(searchParams.get('id') || '');
    const [searched, setSearched] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null); // treatment-plan/{id}/payment/ javobi
    const [results, setResults] = useState(null); // F.I.O. bo'yicha qidiruv natijalari (bir nechta bo'lsa)

    // Qaysi to'lov formasi ochiq turibdi: null | 'all' | day.id
    const [payingKey, setPayingKey] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [submitting, setSubmitting] = useState(false);

    // ID raqami bo'yicha aniq davolash rejasini yuklash
    const performSearchById = async (idValue, { keepResults = false } = {}) => {
        if (!idValue.trim()) return;

        setSearched(true);
        setLoading(true);
        setError(null);
        setData(null);
        if (!keepResults) setResults(null);
        setPayingKey(null);

        try {
            const token = localStorage.getItem('hospital_access');
            const res = await fetch(`${api}/treatment-plan/${idValue.trim()}/payment/`, {
                method: 'GET',
                headers: authHeaders(token),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("To'lov ma'lumotini olishda xatolik:", err);
            setError("Bu ID raqamiga tegishli davolash rejasi topilmadi");
        } finally {
            setLoading(false);
        }
    };

    // F.I.O. (yoki telefon) bo'yicha qidirish — bir nechta natija qaytarishi mumkin
    const performSearchByName = async (q) => {
        setSearched(true);
        setLoading(true);
        setError(null);
        setData(null);
        setResults(null);
        setPayingKey(null);

        try {
            const token = localStorage.getItem('hospital_access');
            const res = await fetch(`${api}/patients/search/?search=${encodeURIComponent(q.trim())}`, {
                method: 'GET',
                headers: authHeaders(token),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const json = await res.json();
            const list = Array.isArray(json) ? json : (json.results || []);

            if (list.length === 0) {
                setError("Bu F.I.O. bo'yicha bemor topilmadi");
            } else if (list.length === 1) {
                // Yagona natija bo'lsa — to'g'ridan to'lov kartasini ochamiz
                await performSearchById(String(list[0].treatment_plan_id));
            } else {
                setResults(list);
            }
        } catch (err) {
            console.error("Bemorni qidirishda xatolik:", err);
            setError("Qidiruvda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        if (isNumeric(query)) {
            setSearchParams({ id: query.trim() });
            performSearchById(query.trim());
        } else {
            setSearchParams({});
            performSearchByName(query.trim());
        }
    };

    const clearSearch = () => {
        setQuery('');
        setSearched(false);
        setData(null);
        setResults(null);
        setError(null);
        setPayingKey(null);
        setSearchParams({});
    };

    useEffect(() => {
        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            setQuery(idFromUrl);
            performSearchById(idFromUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refetch = () => {
        if (data?.treatment_plan_id) {
            performSearchById(String(data.treatment_plan_id), { keepResults: true });
        }
    };

    // Qidiruv ro'yxatidan bitta bemorni tanlash
    const openResult = (result) => {
        setSearchParams({ id: String(result.treatment_plan_id) });
        performSearchById(String(result.treatment_plan_id), { keepResults: true });
    };

    // To'lov kartasidan qidiruv ro'yxatiga qaytish
    const backToResults = () => {
        setData(null);
        setError(null);
        setSearchParams({});
    };

    const openPayForm = (key) => {
        setPayingKey(key);
        setPaymentMethod('CASH');
    };

    const closePayForm = () => setPayingKey(null);

    // day = null -> umumiy (qolgan summani) to'lash
    const submitPayment = async (day) => {
        if (!data) return;

        const amount = day ? day.remaining_amount : data.remaining_amount;
        if (!amount || amount <= 0) {
            showToast("To'lov uchun summa qolmagan", "warning");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('hospital_access');
            const res = await fetch(`${api}/treatment-plan/${data.treatment_plan_id}/payment/create/`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    amount,
                    payment_method: paymentMethod,
                    ...(day ? { day_id: day.id } : {}),
                }),
            });
            if (!res.ok) throw new Error('payment failed');

            showToast("To'lov muvaffaqiyatli amalga oshirildi", "success");
            setPayingKey(null);
            refetch();
        } catch (err) {
            console.error("To'lovni amalga oshirishda xatolik:", err);
            showToast("To'lovni amalga oshirib bo'lmadi", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const days = data?.days ? [...data.days].sort((a, b) => a.day_number - b.day_number) : [];
    const paidRatio = data && data.total_amount > 0
        ? Math.min(100, Math.round((data.paid_amount / data.total_amount) * 100))
        : 0;
    const fullyPaid = data && data.remaining_amount <= 0;
    const showBackBtn = data && results && results.length > 0;

    return (
        <div className={s.PatientsPage}>

            {/* HEADER */}
            <div className={s.TopRow}>
                <div>
                    <h1>Bemor to'lovlari</h1>
                    <p>F.I.O. yoki ID raqami orqali bemorni qidirib, to'lov holatini ko'ring</p>
                </div>
            </div>

            {/* SEARCH */}
            <form className={s.SearchForm} onSubmit={handleSearch}>
                <div className={s.SearchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Bemor F.I.O. yoki ID raqamini kiriting..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSearched(false);
                        }}
                    />
                    {query && (
                        <button type="button" className={s.ClearBtn} onClick={clearSearch}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                </div>

                <button type="submit" className={s.SearchBtn} disabled={!query.trim() || loading}>
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
                        <h3>Bemorni qidiring</h3>
                        <p>
                            Bemorning F.I.O. yoki ID raqamini kiritsangiz,
                            unga tegishli to'lov holati shu yerda chiqadi.
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

            {/* EMPTY / ERROR */}
            {searched && !loading && error && (
                <div className={s.Empty}>
                    <div className={s.EmptyIcon}>
                        <i className="bi bi-search"></i>
                    </div>
                    <h3>Hech narsa topilmadi</h3>
                    <p>
                        <strong>{query}</strong> bo'yicha natija topilmadi.
                    </p>
                </div>
            )}

            {/* SEARCH RESULTS LIST (F.I.O. bo'yicha bir nechta mos kelgan bemor) */}
            {searched && !loading && !error && !data && results && results.length > 0 && (
                <div className={s.ResultsSection}>
                    <div className={s.ResultsHeader}>
                        <div>
                            <h2>Topilgan bemorlar</h2>
                            <p>Kerakli bemorni tanlang</p>
                        </div>
                        <span className={s.SearchIdBadge}>
                            <i className="bi bi-people"></i>
                            {results.length} ta natija
                        </span>
                    </div>

                    <div className={s.MatchList}>
                        {results.map((r) => {
                            const rFullyPaid = r.is_paid ?? (r.remaining_amount <= 0);
                            return (
                                <div
                                    key={r.treatment_plan_id}
                                    className={s.MatchCard}
                                    onClick={() => openResult(r)}
                                >
                                    <div className={s.MatchTop}>
                                        <span className={s.MatchName}>{getPatientName(r.patient)}</span>
                                        <span className={`${s.StatusBadge} ${rFullyPaid ? s.done : s.waiting}`}>
                                            <span className={s.StatusDot} />
                                            {rFullyPaid ? "To'langan" : "To'lov qoldi"}
                                        </span>
                                    </div>

                                    <div className={s.MatchStats}>
                                        <span className={s.MatchPlanId}>
                                            <i className="bi bi-hash"></i>Reja #{r.treatment_plan_id}
                                        </span>
                                        {r.patient?.contact_number && (
                                            <span className={s.MatchPhone}>
                                                <i className="bi bi-telephone"></i>{r.patient.contact_number}
                                            </span>
                                        )}
                                        <span className={s.MatchAmount}>
                                            Qolgan: <strong className={rFullyPaid ? '' : s.RemainingValue}>
                                                {formatSum(r.remaining_amount)}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* RESULT (aniq bemorning to'lov kartasi) */}
            {searched && !loading && !error && data && (
                <div className={s.ResultsSection}>

                    <div className={s.ResultsHeader}>
                        <div className={s.ResultsHeaderTitle}>
                            {showBackBtn && (
                                <button type="button" className={s.BackBtn} onClick={backToResults}>
                                    <i className="bi bi-arrow-left"></i>
                                </button>
                            )}
                            <div>
                                <h2>To'lov holati</h2>
                                <p>Davolash rejasi bo'yicha to'lov ma'lumoti</p>
                            </div>
                        </div>

                        <span className={s.SearchIdBadge}>
                            <i className="bi bi-hash"></i>
                            {data.treatment_plan_id}
                        </span>
                    </div>

                    {/* SUMMARY CARD */}
                    <div className={s.SummaryCard}>
                        <div className={s.SummaryTop}>
                            <span className={`${s.StatusBadge} ${fullyPaid ? s.done : s.waiting}`}>
                                <span className={s.StatusDot} />
                                {fullyPaid ? "To'liq to'langan" : "To'lov kutilmoqda"}
                            </span>

                            {!fullyPaid && (
                                payingKey === 'all' ? (
                                    <div className={s.PayForm}>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            {PAYMENT_METHODS.map((m) => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className={s.ConfirmBtn}
                                            disabled={submitting}
                                            onClick={() => submitPayment(null)}
                                        >
                                            Tasdiqlash
                                        </button>
                                        <button
                                            type="button"
                                            className={s.CancelBtn}
                                            disabled={submitting}
                                            onClick={closePayForm}
                                        >
                                            Bekor qilish
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className={s.PayAllBtn}
                                        onClick={() => openPayForm('all')}
                                    >
                                        <i className="bi bi-cash-coin"></i>
                                        Barchasini to'lash
                                    </button>
                                )
                            )}
                        </div>

                        <div className={s.ProgressBar}>
                            <div className={s.ProgressFill} style={{ width: `${paidRatio}%` }} />
                        </div>

                        <div className={s.SummaryStats}>
                            <div className={s.StatItem}>
                                <span>Jami summa</span>
                                <strong>{formatSum(data.total_amount)}</strong>
                            </div>
                            <div className={s.StatItem}>
                                <span>To'langan</span>
                                <strong className={s.PaidValue}>{formatSum(data.paid_amount)}</strong>
                            </div>
                            <div className={s.StatItem}>
                                <span>Qolgan</span>
                                <strong className={fullyPaid ? '' : s.RemainingValue}>
                                    {formatSum(data.remaining_amount)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* DAYS */}
                    {days.length > 0 && (
                        <div className={s.DaysGrid}>
                            {days.map((day) => (
                                <div key={day.id} className={s.DayCard}>
                                    <div className={s.DayCardTop}>
                                        <span className={s.DayBadge}>{day.day_number}-kun</span>
                                        <span className={`${s.StatusBadge} ${day.is_paid ? s.done : s.waiting}`}>
                                            <span className={s.StatusDot} />
                                            {day.is_paid ? "To'langan" : "To'lanmagan"}
                                        </span>
                                    </div>

                                    <div className={s.DayPriceRows}>
                                        <div className={s.PriceRow}>
                                            <span>Muolaja narxi</span>
                                            <strong>{formatSum(day.treatment_price)}</strong>
                                        </div>
                                        <div className={s.PriceRow}>
                                            <span>Dori narxi</span>
                                            <strong>{formatSum(day.medicine_price)}</strong>
                                        </div>
                                        <div className={`${s.PriceRow} ${s.PriceRowTotal}`}>
                                            <span>Jami</span>
                                            <strong>{formatSum(day.total_price)}</strong>
                                        </div>
                                    </div>

                                    <div className={s.DayPaidRows}>
                                        <div className={s.PriceRow}>
                                            <span>To'langan</span>
                                            <strong className={s.PaidValue}>{formatSum(day.paid_amount)}</strong>
                                        </div>
                                        <div className={s.PriceRow}>
                                            <span>Qolgan</span>
                                            <strong className={day.is_paid ? '' : s.RemainingValue}>
                                                {formatSum(day.remaining_amount)}
                                            </strong>
                                        </div>
                                    </div>

                                    {!day.is_paid && (
                                        payingKey === day.id ? (
                                            <div className={s.PayForm}>
                                                <select
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                >
                                                    {PAYMENT_METHODS.map((m) => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className={s.ConfirmBtn}
                                                    disabled={submitting}
                                                    onClick={() => submitPayment(day)}
                                                >
                                                    Tasdiqlash
                                                </button>
                                                <button
                                                    type="button"
                                                    className={s.CancelBtn}
                                                    disabled={submitting}
                                                    onClick={closePayForm}
                                                >
                                                    Bekor qilish
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className={s.PayDayBtn}
                                                onClick={() => openPayForm(day.id)}
                                            >
                                                <i className="bi bi-cash"></i>
                                                1 kunlikni to'lash
                                            </button>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* PAYMENTS HISTORY */}
                    {data.payments && data.payments.length > 0 && (
                        <div className={s.HistoryCard}>
                            <p className={s.HistoryTitle}>
                                <i className="bi bi-clock-history"></i> To'lovlar tarixi
                            </p>
                            <ul className={s.HistoryList}>
                                {data.payments.map((p) => (
                                    <li key={p.id}>
                                        <span className={s.HistoryAmount}>{formatSum(p.amount)}</span>
                                        <span className={s.HistoryMethod}>
                                            {PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label || p.payment_method || '—'}
                                        </span>
                                        <span className={s.HistoryDate}>{formatDate(p.created_at)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NursePaidPatients;