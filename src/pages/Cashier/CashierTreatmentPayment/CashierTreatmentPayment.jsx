import React, { useEffect, useMemo, useState } from 'react';
import s from './CashierTreatmentPayment.module.scss';
import { api } from '../../../App'; // yo'lni loyihangizga moslang
import Modal from '../../../components/Modal/Modal';
import { printPlanReceipt } from '../../../components/shared/CashierReceipt/PlanReceipt';


// ============================================================
// Yordamchi funksiyalar
// ============================================================

// ⚠️ To'langanlar API manzili (o'zingizdagiga moslang)
const UNPAID_PATH = '/treatment-plans/unpaid/';
const PAID_PATH = '/treatment-plans/paid/';

const authHeaders = (token, json = true) => ({
  Authorization: `Bearer ${token}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const formatSum = (n) =>
  Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const fullName = (p) =>
  [p?.first_name, p?.last_name, p?.middle_name].filter(Boolean).join(' ');

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Qo'shimcha summa inputi uchun
const onlyDigits = (v) => v.replace(/\D/g, '');
const formatInput = (v) => (v ? Number(v).toLocaleString('uz-UZ') : '');

// ⚠️ Backend "status" qiymatlari (PAID / PARTIAL) ma'lum. To'lanmagan
// holat nomi (masalan UNPAID) taxmin — boshqacha bo'lsa shu yerni tuzating.
const PAY_STATUS = {
  UNPAID: { label: "To'lanmagan", className: 'unpaid' },
  PARTIAL: { label: 'Qisman', className: 'partial' },
  PAID: { label: "To'langan", className: 'paid' },
};
const payStatusInfo = (st) => PAY_STATUS[st] || PAY_STATUS.UNPAID;

const CARE_TYPE = {
  INPATIENT: 'Statsionar',
  OUTPATIENT: 'Ambulator',
};

// ⚠️ To'lov usullari backend'dagi Payment.payment_method choices'iga
// mos bo'lishi kerak. Faqat "CASH" aniq ma'lum, qolganlari taxmin.
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Naqd', icon: 'bi-cash-stack' },
  { value: 'CARD', label: 'Karta', icon: 'bi-credit-card' },
  { value: 'TRANSFER', label: "O'tkazma", icon: 'bi-bank' },
];

const methodLabel = (v) =>
  PAYMENT_METHODS.find((m) => m.value === v)?.label || v;

// ⚠️ Backend "day_remaining", "day_total", "day_paid", "day_status"
// yuboradi. Bizning UI esa "remaining", "total", "paid", "status"
// ishlatadi. Shu funksiya ikkala nomni ham qo'llab-quvvatlaydi.
const normalizeDay = (d) => ({
  ...d,
  day_id: d.day_id ?? d.id,
  remaining: Number(d.remaining ?? d.day_remaining ?? 0) || 0,
  total: Number(d.total ?? d.day_total ?? 0) || 0,
  paid: Number(d.paid ?? d.day_paid ?? 0) || 0,
  status: d.status ?? d.day_status ?? 'UNPAID',
});

// ============================================================
// Komponent
// ============================================================

const CashierTreatmentPayment = () => {
  const [tab, setTab] = useState('unpaid'); // unpaid | paid
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [plans, setPlans] = useState([]);           // to'lanmaganlar
  const [paidPlans, setPaidPlans] = useState(null); // to'langanlar (null = hali yuklanmagan)
  const [loading, setLoading] = useState(true);
  const [paidLoading, setPaidLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paidError, setPaidError] = useState(null);

  // Modal
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [detail, setDetail] = useState(null);   // payment-days javobi
  const [history, setHistory] = useState([]);   // payment-status.payments
  const [detailLoading, setDetailLoading] = useState(false);

  // To'lov formasi: { [dayId]: amountString } — kalit bor = kun tanlangan
  const [picked, setPicked] = useState({});
  const [method, setMethod] = useState('CASH');
  const [comment, setComment] = useState('');
  const [paying, setPaying] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [printingId, setPrintingId] = useState(null);

  // Qo'shimcha to'lov
  const [showExtra, setShowExtra] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNote, setExtraNote] = useState('');

  const getToken = () => localStorage.getItem('hospital_access');

  const resetExtra = () => {
    setShowExtra(false);
    setExtraAmount('');
    setExtraNote('');
  };

  // ------------------------------------------------------------
  // Ro'yxatlar
  // ------------------------------------------------------------
  const fetchList = async (path) => {
    const res = await fetch(`${api}${path}`, {
      headers: authHeaders(getToken()),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.results || [];
    // plan_id o'rniga id kelsa ham ishlashi uchun
    return list.map((p) => ({ ...p, plan_id: p.plan_id ?? p.id }));
  };

  const fetchPlans = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      setPlans(await fetchList(UNPAID_PATH));
    } catch (err) {
      console.error("To'lanmagan rejalarni olishda xatolik:", err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchPaid = async () => {
    try {
      setPaidLoading(true);
      setPaidError(null);
      setPaidPlans(await fetchList(PAID_PATH));
    } catch (err) {
      console.error("To'langan rejalarni olishda xatolik:", err);
      setPaidError(err.message);
    } finally {
      setPaidLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "To'langan" tabi ochilganda har safar yangidan so'raymiz
  useEffect(() => {
    if (tab === 'paid') fetchPaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ------------------------------------------------------------
  // Modal ma'lumotlari
  // ------------------------------------------------------------
  const fetchPlanDetail = async (planId) => {
    try {
      setDetailLoading(true);
      const headers = authHeaders(getToken());
      const [daysRes, statusRes] = await Promise.all([
        fetch(`${api}/treatment-plans/${planId}/payment-days/`, { headers }),
        fetch(`${api}/treatment-plans/${planId}/payment-status/`, { headers }),
      ]);
      if (!daysRes.ok) throw new Error(`HTTP error! status: ${daysRes.status}`);

      const daysData = await daysRes.json();
      setDetail(daysData);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setHistory(statusData.payments || []);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("To'lov ma'lumotlarini olishda xatolik:", err);
      setFormError(err.message || "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openPlan = (plan) => {
    setSelectedPlan(plan);
    setDetail(null);
    setHistory([]);
    setPicked({});
    setMethod('CASH');
    setComment('');
    setFormError('');
    setFormSuccess('');
    resetExtra();
    fetchPlanDetail(plan.plan_id);
  };

  const closePlan = () => {
    setSelectedPlan(null);
    resetExtra();
  };

  // ------------------------------------------------------------
  // Chek chop etish (faqat to'langan rejalar uchun)
  // ------------------------------------------------------------
  const handlePrint = async (plan) => {
    try {
      setPrintingId(plan.plan_id);
      const headers = authHeaders(getToken());
      const [daysRes, statusRes] = await Promise.all([
        fetch(`${api}/treatment-plans/${plan.plan_id}/payment-days/`, { headers }),
        fetch(`${api}/treatment-plans/${plan.plan_id}/payment-status/`, { headers }),
      ]);
      const daysData = daysRes.ok ? await daysRes.json() : null;
      const statusData = statusRes.ok ? await statusRes.json() : null;

      const p = plan.patient || {};
      printPlanReceipt({
        id: plan.plan_id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || fullName(p),
        birthDate: p.birth_date || p.date_of_birth || p.birthday || '',
        careType: CARE_TYPE[plan.care_type] || plan.care_type,
        diagnosis: plan.diagnosis,
        total: daysData?.total ?? plan.total,
        paid: daysData?.paid ?? plan.paid,
        remaining: daysData?.remaining ?? plan.remaining,
        payments: statusData?.payments || [],
      });
    } catch (err) {
      console.error('Chek chiqarishda xatolik:', err);
    } finally {
      setPrintingId(null);
    }
  };

  // ------------------------------------------------------------
  // Kunlarni tanlash / summa
  // ------------------------------------------------------------

  // ⚠️ MUHIM: detail.days dagi har bir kunni normalize qilamiz
  // Backend "day_remaining" yuboradi, biz "remaining" ishlatamiz.
  const daysList = useMemo(
    () => (detail?.days || []).map(normalizeDay),
    [detail]
  );

  const unpaidDays = useMemo(
    () => daysList.filter((d) => Number(d.remaining) > 0),
    [daysList]
  );

  // Haqiqatan to'liq to'langan: ma'lumot yuklangan, kunlar bor,
  // qoldiq kunlarda ham, reja bo'yicha ham 0, jami summa > 0
  const isFullyPaid =
    !!detail &&
    daysList.length > 0 &&
    unpaidDays.length === 0 &&
    Number(detail.remaining ?? 0) <= 0 &&
    Number(detail.total ?? 0) > 0;

  const toggleDay = (day) => {
    setFormError('');
    setPicked((prev) => {
      const next = { ...prev };
      if (next[day.day_id] !== undefined) delete next[day.day_id];
      else next[day.day_id] = String(Number(day.remaining));
      return next;
    });
  };

  const changeAmount = (day, value) => {
    const clean = value.replace(/[^\d.]/g, '');
    const max = Number(day.remaining);
    const num = Number(clean);
    setPicked((prev) => ({
      ...prev,
      [day.day_id]: num > max ? String(max) : clean,
    }));
  };

  const allPicked =
    unpaidDays.length > 0 && unpaidDays.every((d) => picked[d.day_id] !== undefined);

  const toggleAll = () => {
    if (allPicked) {
      setPicked({});
    } else {
      const next = {};
      unpaidDays.forEach((d) => {
        next[d.day_id] = String(Number(d.remaining));
      });
      setPicked(next);
    }
  };

  // Tanlangan kunlar bo'yicha summa
  const daysTotal = Object.values(picked).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );

  // Qo'shimcha summa (faqat "Qo'shimcha" ochiq bo'lsa hisoblanadi)
  const extraValue = showExtra ? Number(extraAmount) || 0 : 0;

  // Jami to'lanadigan summa = kunlar + qo'shimcha
  const totalToPay = daysTotal + extraValue;

  // ------------------------------------------------------------
  // To'lov qabul qilish
  // ------------------------------------------------------------
  const handlePay = async () => {
    if (!selectedPlan) return;

    const allocations = Object.entries(picked)
      .map(([dayId, amount]) => ({ day: Number(dayId), amount: Number(amount) }))
      .filter((a) => a.amount > 0);

    if (allocations.length === 0) {
      setFormError('Kamida bitta kun va summa tanlang');
      return;
    }

    const note = showExtra ? extraNote.trim() : '';

    // ⚠️ Backend maydon nomlariga moslang (extra_amount / extra_note)
    const payload = {
      allocations,
      payment_method: method,
      comment: comment.trim(),
    };
    if (extraValue > 0 || note) {
      payload.extra_amount = extraValue;
      payload.extra_note = note;
    }

    try {
      setPaying(true);
      setFormError('');
      setFormSuccess('');

      const res = await fetch(
        `${api}/treatment-plans/${selectedPlan.plan_id}/pay/`,
        {
          method: 'POST',
          headers: authHeaders(getToken()),
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP error! status: ${res.status}`);

      setFormSuccess(
        `${formatSum(data.amount ?? totalToPay)} to'lov qabul qilindi`
      );
      setPicked({});
      setComment('');
      resetExtra();

      await Promise.all([fetchPlanDetail(selectedPlan.plan_id), fetchPlans(true)]);
    } catch (err) {
      console.error("To'lovda xatolik:", err);
      setFormError(err.message || "To'lovni qabul qilib bo'lmadi");
    } finally {
      setPaying(false);
    }
  };

  // ------------------------------------------------------------
  // Filtr + statistika
  // ------------------------------------------------------------
  const source = tab === 'unpaid' ? plans : paidPlans || [];

  const filtered = source.filter((p) => {
    const matchName = fullName(p.patient).toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      tab === 'paid' || statusFilter === 'ALL' || p.status === statusFilter;
    return matchName && matchStatus;
  });

  const totalDebt = plans.reduce((sum, p) => sum + (Number(p.remaining) || 0), 0);
  const totalPaid = plans.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);

  const paidSum = (paidPlans || []).reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
  const paidTotalSum = (paidPlans || []).reduce((sum, p) => sum + (Number(p.total) || 0), 0);

  const renderStatusBadge = (st) => {
    const info = payStatusInfo(st);
    return <span className={`${s.StatusBadge} ${s[info.className]}`}>{info.label}</span>;
  };

  const isPaidTab = tab === 'paid';
  const paidBusy = isPaidTab && paidLoading;

  // ------------------------------------------------------------
  // Loading / Error
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className={s.PatientsPage}>
        <p>Ma'lumotlar yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.PatientsPage}>
        <p>Ma'lumotlarni yuklashda xatolik: {error}</p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className={s.PatientsPage}>
      <div className={s.TopRow}>
        <div>
          <h1>Davolanish uchun to'lovlar</h1>
          <p>
            {isPaidTab
              ? "To'lovi yakunlangan davolash rejalari"
              : "To'lov kutayotgan davolash rejalari"}
          </p>
        </div>

        <div className={s.ViewSwitch}>
          <button
            className={view === 'table' ? s.Active : ''}
            onClick={() => setView('table')}
          >
            <i className="bi bi-list-ul"></i>
          </button>
          <button
            className={view === 'card' ? s.Active : ''}
            onClick={() => setView('card')}
          >
            <i className="bi bi-grid-3x3-gap-fill"></i>
          </button>
        </div>
      </div>

      {/* STATISTIKA */}
      {isPaidTab ? (
        <div className={s.StatsRow}>
          <div className={s.StatCard}>
            <div className={`${s.StatIcon} ${s.StatIconGreen}`}>
              <i className="bi bi-check2-circle"></i>
            </div>
            <div>
              <span>Jami to'langan</span>
              <p>{paidPlans ? formatSum(paidSum) : '—'}</p>
            </div>
          </div>
          <div className={s.StatCard}>
            <div className={`${s.StatIcon} ${s.StatIconBlue}`}>
              <i className="bi bi-receipt"></i>
            </div>
            <div>
              <span>Rejalar jami summasi</span>
              <p>{paidPlans ? formatSum(paidTotalSum) : '—'}</p>
            </div>
          </div>
          <div className={s.StatCard}>
            <div className={`${s.StatIcon} ${s.StatIconBlue}`}>
              <i className="bi bi-clipboard2-pulse"></i>
            </div>
            <div>
              <span>To'langan rejalar</span>
              <p>{paidPlans ? `${paidPlans.length} ta` : '—'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={s.StatsRow}>
          <div className={s.StatCard}>
            <div className={`${s.StatIcon} ${s.StatIconRed}`}>
              <i className="bi bi-exclamation-circle"></i>
            </div>
            <div>
              <span>Umumiy qarz</span>
              <p>{formatSum(totalDebt)}</p>
            </div>
          </div>
          <div className={s.StatCard}>
            <div className={`${s.StatIcon} ${s.StatIconGreen}`}>
              <i className="bi bi-check2-circle"></i>
            </div>
            <div>
              <span>Qisman to'langan</span>
              <p>{formatSum(totalPaid)}</p>
            </div>
          </div>
          <div className={s.StatCard}>
            <div className={`${s.StatIcon} ${s.StatIconBlue}`}>
              <i className="bi bi-clipboard2-pulse"></i>
            </div>
            <div>
              <span>Kutayotgan rejalar</span>
              <p>{plans.length} ta</p>
            </div>
          </div>
        </div>
      )}

      {/* QIDIRUV + TAB + FILTR */}
      <div className={s.SearchRow}>
        <div className={s.SearchBox}>
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Bemor ismi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={s.FilterTabs}>
          <button
            className={tab === 'unpaid' ? s.FilterActive : ''}
            onClick={() => setTab('unpaid')}
          >
            To'lanmagan
          </button>
          <button
            className={tab === 'paid' ? s.FilterActive : ''}
            onClick={() => setTab('paid')}
          >
            To'langan
          </button>
        </div>

        {!isPaidTab && (
          <div className={s.FilterTabs}>
            {[
              { key: 'ALL', label: 'Barchasi' },
              { key: 'UNPAID', label: "To'lanmagan" },
              { key: 'PARTIAL', label: 'Qisman' },
            ].map((f) => (
              <button
                key={f.key}
                className={statusFilter === f.key ? s.FilterActive : ''}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* To'langanlar yuklanmoqda / xatolik */}
      {paidBusy && <p className={s.Muted}>Yuklanmoqda...</p>}
      {isPaidTab && !paidLoading && paidError && (
        <p className={s.FormError}>
          <i className="bi bi-exclamation-circle-fill"></i>
          To'langan rejalarni yuklashda xatolik: {paidError}
        </p>
      )}

      {!paidBusy && !(isPaidTab && paidError) && filtered.length === 0 && (
        <p className={s.Empty}>
          {isPaidTab ? "To'langan reja topilmadi" : "To'lov kutayotgan reja topilmadi"}
        </p>
      )}

      {/* JADVAL */}
      {!paidBusy && view === 'table' && filtered.length > 0 && (
        <div className={s.TableWrap}>
          <table className={s.Table}>
            <thead>
              <tr>
                <th>F.I.O</th>
                <th>Turi</th>
                <th>Jami</th>
                <th>To'langan</th>
                <th>Qoldiq</th>
                <th>Holati</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.plan_id} onClick={() => openPlan(p)}>
                  <td>
                    <div className={s.NameCell}>
                      <div className={s.Avatar}>
                        {p.patient?.first_name?.[0] || '?'}
                      </div>
                      <div>
                        <span>{p.patient?.first_name} {p.patient?.last_name}</span>
                        {p.diagnosis && (
                          <p className={s.NameCellSub}>{p.diagnosis}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{CARE_TYPE[p.care_type] || p.care_type}</td>
                  <td>{formatSum(p.total)}</td>
                  <td>{formatSum(p.paid)}</td>
                  <td className={Number(p.remaining) > 0 ? s.DebtCell : ''}>
                    {formatSum(p.remaining)}
                  </td>
                  <td>{renderStatusBadge(isPaidTab ? 'PAID' : p.status)}</td>
                  <td className={s.ArrowCell}>
                    {isPaidTab ? (
                      <button
                        type="button"
                        title="Chekni chop etish"
                        className={s.LinkBtn}
                        disabled={printingId === p.plan_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(p);
                        }}
                      >
                        <i className={`bi ${printingId === p.plan_id ? 'bi-hourglass-split' : 'bi-printer'}`}></i>
                      </button>
                    ) : (
                      <i className="bi bi-chevron-right"></i>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KARTALAR */}
      {!paidBusy && view === 'card' && filtered.length > 0 && (
        <div className={s.CardsGrid}>
          {filtered.map((p) => {
            const total = Number(p.total) || 0;
            const percent = total ? Math.round(((Number(p.paid) || 0) / total) * 100) : 0;

            return (
              <div key={p.plan_id} className={s.PatientCard} onClick={() => openPlan(p)}>
                <div className={s.CardTop}>
                  <div className={s.Avatar}>
                    {p.patient?.first_name?.[0] || '?'}
                  </div>
                  {renderStatusBadge(isPaidTab ? 'PAID' : p.status)}
                </div>
                <h3>{p.patient?.first_name} {p.patient?.last_name}</h3>
                <p className={s.CardAge}>
                  {CARE_TYPE[p.care_type] || p.care_type}
                </p>
                {p.diagnosis && <p className={s.NameCellSub}>{p.diagnosis}</p>}

                <div className={s.CardProgressRow}>
                  <div className={s.ProgressTrack}>
                    <div className={s.ProgressFill} style={{ width: `${percent}%` }} />
                  </div>
                  <span>{percent}%</span>
                </div>

                <div className={s.CardInfo}>
                  <span><i className="bi bi-receipt"></i> Jami: {formatSum(p.total)}</span>
                  {isPaidTab ? (
                    <span>
                      <i className="bi bi-check2-circle"></i> To'langan: {formatSum(p.paid)}
                    </span>
                  ) : (
                    <span className={s.DebtText}>
                      <i className="bi bi-exclamation-circle"></i> Qoldiq: {formatSum(p.remaining)}
                    </span>
                  )}
                  <span><i className="bi bi-telephone"></i> {p.patient?.contact_number || '—'}</span>
                  {isPaidTab && (
                    <button
                      type="button"
                      className={s.LinkBtn}
                      disabled={printingId === p.plan_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(p);
                      }}
                    >
                      <i className="bi bi-printer"></i> Chekni chop etish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TO'LOV MODALI */}
      <Modal isOpen={!!selectedPlan} onClose={closePlan} side="right">
        {selectedPlan && (
          <>
            <div className={s.DrawerHead}>
              <div className={s.DrawerAvatar}>
                {selectedPlan.patient?.first_name?.[0] || '?'}
              </div>
              <div>
                <h2>{fullName(selectedPlan.patient)}</h2>
                <p>
                  {CARE_TYPE[selectedPlan.care_type] || selectedPlan.care_type}
                  {selectedPlan.diagnosis ? ` · ${selectedPlan.diagnosis}` : ''}
                </p>
              </div>
            </div>

            <div className={s.DrawerBody}>
              {detailLoading && !detail && <p className={s.Muted}>Yuklanmoqda...</p>}

              {detail && (
                <>
                  {/* XULOSA */}
                  <div className={s.SummaryBox}>
                    <div>
                      <span>Jami</span>
                      <p>{formatSum(detail.total)}</p>
                    </div>
                    <div>
                      <span>To'langan</span>
                      <p className={s.GreenText}>{formatSum(detail.paid)}</p>
                    </div>
                    <div>
                      <span>Qoldiq</span>
                      <p className={s.RedText}>{formatSum(detail.remaining)}</p>
                    </div>
                  </div>

                  {detail.room_price_per_day != null &&
                    Number(detail.room_price_per_day) > 0 && (
                      <p className={s.RoomInfo}>
                        <i className="bi bi-door-open"></i>
                        Xona narxi: {formatSum(detail.room_price_per_day)} / kun
                      </p>
                    )}

                  {/* KUNLAR */}
                  <div className={s.SectionHead}>
                    <p className={s.DrawerSectionTitle}>To'lanadigan kunlar</p>
                    {unpaidDays.length > 0 && (
                      <button type="button" className={s.LinkBtn} onClick={toggleAll}>
                        {allPicked ? 'Tanlovni bekor qilish' : 'Barchasini tanlash'}
                      </button>
                    )}
                  </div>

                  {unpaidDays.length === 0 ? (
                    isFullyPaid ? (
                      <div className={s.AllPaidBox}>
                        <i className="bi bi-check-circle-fill"></i>
                        <p>Barcha kunlar to'langan</p>
                      </div>
                    ) : (
                      <p className={s.Muted}>To'lanadigan kunlar topilmadi</p>
                    )
                  ) : (
                    <div className={s.DayPayList}>
                      {unpaidDays.map((day) => {
                        const isPicked = picked[day.day_id] !== undefined;
                        return (
                          <div
                            key={day.day_id}
                            className={`${s.DayPayItem} ${isPicked ? s.DayPayItemPicked : ''}`}
                          >
                            <label className={s.DayPayTop}>
                              <input
                                type="checkbox"
                                checked={isPicked}
                                onChange={() => toggleDay(day)}
                              />
                              <span className={s.DayPayName}>
                                {day.day_number}-kun
                              </span>
                              <span className={s.DayPayRemain}>
                                Qoldiq: {formatSum(day.remaining)}
                              </span>
                            </label>

                            {isPicked && (
                              <div className={s.AmountRow}>
                                <span>To'lanadigan summa</span>
                                <div className={s.AmountInput}>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={picked[day.day_id]}
                                    onChange={(e) => changeAmount(day, e.target.value)}
                                  />
                                  <em>so'm</em>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* QO'SHIMCHA + TO'LOV USULI + IZOH */}
                  {unpaidDays.length > 0 && (
                    <>
                      {/* QO'SHIMCHA */}
                      <button
                        type="button"
                        className={`${s.ExtraToggle} ${showExtra ? s.ExtraToggleActive : ''}`}
                        onClick={() => setShowExtra((p) => !p)}
                      >
                        <i className={`bi ${showExtra ? 'bi-dash-circle' : 'bi-plus-circle'}`}></i>
                        Qo'shimcha
                      </button>

                      {showExtra && (
                        <div className={s.ExtraBox}>
                          <label className={s.ExtraLabel}>To'lov summasi</label>
                          <div className={s.ExtraInputWrap}>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={formatInput(extraAmount)}
                              onChange={(e) => setExtraAmount(onlyDigits(e.target.value))}
                            />
                            <span>so'm</span>
                          </div>

                          <label className={s.ExtraLabel}>Izoh</label>
                          <textarea
                            rows={3}
                            placeholder="Qo'shimcha to'lov izohi..."
                            value={extraNote}
                            onChange={(e) => setExtraNote(e.target.value)}
                          />
                        </div>
                      )}

                      <p className={s.DrawerSectionTitle}>To'lov usuli</p>
                      <div className={s.MethodRow}>
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            className={`${s.MethodBtn} ${method === m.value ? s.MethodBtnActive : ''}`}
                            onClick={() => setMethod(m.value)}
                          >
                            <i className={`bi ${m.icon}`}></i>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div className={s.Field}>
                        <label>Izoh (ixtiyoriy)</label>
                        <textarea
                          rows={2}
                          placeholder="To'lov haqida izoh..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>

                      {formError && (
                        <p className={s.FormError}>
                          <i className="bi bi-exclamation-circle-fill"></i> {formError}
                        </p>
                      )}

                      <button
                        type="button"
                        className={s.PayBtn}
                        onClick={handlePay}
                        disabled={paying || daysTotal <= 0}
                      >
                        <i className="bi bi-wallet2"></i>
                        {paying
                          ? 'Qabul qilinmoqda...'
                          : `To'lovni qabul qilish · ${formatSum(totalToPay)}`}
                      </button>
                    </>
                  )}

                  {/* Chek — faqat haqiqatan to'liq to'langan bo'lsa */}
                  {isFullyPaid && (
                    <button
                      type="button"
                      className={s.PayBtn}
                      style={{ marginTop: 16 }}
                      onClick={() => handlePrint(selectedPlan)}
                      disabled={printingId === selectedPlan.plan_id}
                    >
                      <i className="bi bi-printer"></i>
                      Chekni chop etish
                    </button>
                  )}

                  {/* Xatolik kunlar yo'q holatda ham ko'rinsin */}
                  {unpaidDays.length === 0 && formError && (
                    <p className={s.FormError}>
                      <i className="bi bi-exclamation-circle-fill"></i> {formError}
                    </p>
                  )}

                  {formSuccess && (
                    <p className={s.FormSuccess}>
                      <i className="bi bi-check-circle-fill"></i> {formSuccess}
                    </p>
                  )}

                  {/* TARIX */}
                  {history.length > 0 && (
                    <>
                      <p className={`${s.DrawerSectionTitle} ${s.HistoryTitle}`}>
                        To'lovlar tarixi
                      </p>
                      <div className={s.HistoryList}>
                        {history.map((h) => (
                          <div key={h.id} className={s.HistoryItem}>
                            <div className={s.HistoryTop}>
                              <strong>{formatSum(h.amount)}</strong>
                              <span className={s.HistoryMethod}>
                                {methodLabel(h.payment_method)}
                              </span>
                            </div>
                            <p className={s.HistoryDate}>
                              <i className="bi bi-clock"></i> {formatDateTime(h.created_at)}
                            </p>
                            {h.allocations?.length > 0 && (
                              <div className={s.HistoryTags}>
                                {h.allocations.map((a) => (
                                  <span key={a.day_id} className={s.HistoryTag}>
                                    {a.day_number}-kun: {formatSum(a.amount)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {h.comment && (
                              <p className={s.HistoryComment}>{h.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CashierTreatmentPayment;