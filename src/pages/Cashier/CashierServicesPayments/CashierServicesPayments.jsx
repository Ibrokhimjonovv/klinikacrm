import React, { useEffect, useMemo, useState } from 'react';
import s from './CashierServicesPayments.module.scss';
import Modal from '../../../components/Modal/Modal';
import { api } from '../../../App';
// import { printServiceReceipt } from './ServiceReceipt';

// ⚠️ Xizmatlar uchun API manzillari (o'zingizdagiga moslang)
const UNPAID_PATH = '/direct-services/unpaid/';
const PAID_PATH = '/direct-services/paid/';

const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
});

const formatSum = (n) =>
    Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('uz-UZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

// Backend javobini bir xil shaklga keltiramiz
const normalize = (v) => {
    const p = typeof v.patient === 'object' && v.patient ? v.patient : {};

    const name =
        [p.first_name, p.last_name, p.middle_name].filter(Boolean).join(' ') ||
        v.patient_name ||
        v.patient_full_name ||
        `Bemor #${typeof v.patient === 'object' ? p.id ?? '?' : v.patient ?? '?'}`;

    // Chek uchun: otasining ismisiz
    const receiptName = [p.first_name, p.last_name].filter(Boolean).join(' ') || name;

    // Xizmat nomi (bir nechta xizmat bo'lishi mumkin)
    const services = (v.services || v.service_items || [])
        .map((item) =>
            typeof item === 'object'
                ? item.name || item.service_name || item.title
                : item
        )
        .filter(Boolean);

    // Agar bitta xizmat bo'lsa, uni ham olamiz
    const serviceName =
        v.service_name ||
        v.service_title ||
        (typeof v.service === 'object' && v.service ? v.service.name : v.service) ||
        (services.length ? services.join(', ') : '—');

    return {
        id: v.id ?? v.service_id,
        name,
        receiptName,
        initial: name[0] || '?',
        phone: p.contact_number || v.contact_number || '',
        birthDate: p.birth_date || p.date_of_birth || p.birthday || '',
        services,
        serviceName,
        price: Number(v.price || v.amount) || 0,
        isPaid: !!v.is_paid,
        paidAt: v.paid_at,
        createdAt: v.created_at || v.date || v.service_date,
    };
};

const CashierServicesPayments = () => {
    const [tab, setTab] = useState('unpaid'); // unpaid | paid
    const [search, setSearch] = useState('');

    const [services, setServices] = useState([]);       // to'lanmaganlar
    const [paidList, setPaidList] = useState(null);      // to'langanlar (null = hali yuklanmagan)
    const [loading, setLoading] = useState(true);
    const [paidLoading, setPaidLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paidError, setPaidError] = useState(null);

    const [selected, setSelected] = useState(null);      // to'lov oynasi
    const [paidService, setPaidService] = useState(null); // to'lov qabul qilingandan keyingi holat
    const [paying, setPaying] = useState(false);
    const [formError, setFormError] = useState('');

    const getToken = () => localStorage.getItem('hospital_access');

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
        return list.map(normalize);
    };

    const fetchServices = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            setServices(await fetchList(UNPAID_PATH));
        } catch (err) {
            console.error("Xizmatlarni olishda xatolik:", err);
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchPaid = async () => {
        try {
            setPaidLoading(true);
            setPaidError(null);
            const list = await fetchList(PAID_PATH);
            setPaidList(list.map((v) => ({ ...v, isPaid: true })));
        } catch (err) {
            console.error("To'langan xizmatlarni olishda xatolik:", err);
            setPaidError(err.message);
        } finally {
            setPaidLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // "To'langan" tabi ochilganda har safar yangidan so'raymiz
    useEffect(() => {
        if (tab === 'paid') fetchPaid();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    // ------------------------------------------------------------
    // Oynalarni boshqarish
    // ------------------------------------------------------------
    const closeDrawer = () => {
        setSelected(null);
        setPaidService(null);
        setFormError('');
    };

    // ------------------------------------------------------------
    // To'lov qabul qilish
    // ------------------------------------------------------------
    const handlePay = async () => {
        if (!selected) return;
        try {
            setPaying(true);
            setFormError('');

            const res = await fetch(`${api}/direct-services/${selected.id}/pay/`, {
                method: 'POST',
                headers: authHeaders(getToken()),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP error! status: ${res.status}`);

            setPaidService({
                ...selected,
                price: Number(data.amount) || selected.price,
                isPaid: true,
                paidAt: data.paid_at,
            });

            await fetchServices(true);
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
    // Narxi belgilanmagan xizmatlar to'lanmaganlar ro'yxatiga kirmaydi
    const unpaid = useMemo(
        () => services.filter((v) => !v.isPaid && v.price > 0),
        [services]
    );

    const current = tab === 'unpaid' ? unpaid : paidList || [];
    const filtered = current.filter((v) =>
        v.name.toLowerCase().includes(search.toLowerCase())
    );

    const paidTotal = paidList ? paidList.reduce((a, v) => a + v.price, 0) : null;

    if (loading) {
        return (
            <div className={s.PatientsPage}>
                <p className={s.Muted}>Ma'lumotlar yuklanmoqda...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className={s.PatientsPage}>
                <p className={s.FormError}>
                    Ma'lumotlarni yuklashda xatolik: {error}
                </p>
            </div>
        );
    }

    const showPaidStatus = tab === 'paid' && (paidLoading || paidError);

    return (
        <div className={s.PatientsPage}>
            <div className={s.TopRow}>
                <div>
                    <h1>Xizmat to'lovlari</h1>
                    <p>Bemorlarning xizmatlar uchun to'lovlari</p>
                </div>
            </div>

            {/* STATISTIKA */}
            <div className={s.StatsRow}>
                <div className={s.StatCard}>
                    <div className={`${s.StatIcon} ${s.StatIconRed}`}>
                        <i className="bi bi-exclamation-circle"></i>
                    </div>
                    <div>
                        <span>Kutilayotgan summa</span>
                        <p>{formatSum(unpaid.reduce((a, v) => a + v.price, 0))}</p>
                    </div>
                </div>
                <div className={s.StatCard}>
                    <div className={`${s.StatIcon} ${s.StatIconGreen}`}>
                        <i className="bi bi-check2-circle"></i>
                    </div>
                    <div>
                        <span>To'langan</span>
                        <p>{paidTotal === null ? '—' : formatSum(paidTotal)}</p>
                    </div>
                </div>
                <div className={s.StatCard}>
                    <div className={`${s.StatIcon} ${s.StatIconBlue}`}>
                        <i className="bi bi-person-lines-fill"></i>
                    </div>
                    <div>
                        <span>Kutayotgan xizmatlar</span>
                        <p>{unpaid.length} ta</p>
                    </div>
                </div>
            </div>

            {/* QIDIRUV + TAB */}
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
            </div>

            {/* To'langanlar yuklanmoqda / xatolik */}
            {tab === 'paid' && paidLoading && <p className={s.Muted}>Yuklanmoqda...</p>}
            {tab === 'paid' && !paidLoading && paidError && (
                <p className={s.FormError}>
                    <i className="bi bi-exclamation-circle-fill"></i>
                    To'langan xizmatlarni yuklashda xatolik: {paidError}
                </p>
            )}

            {!showPaidStatus && filtered.length === 0 && (
                <p className={s.Empty}>
                    {tab === 'unpaid'
                        ? "To'lov kutayotgan xizmat yo'q"
                        : "To'langan xizmat topilmadi"}
                </p>
            )}

            {/* JADVAL */}
            {!(tab === 'paid' && paidLoading) && filtered.length > 0 && (
                <div className={s.TableWrap}>
                    <table className={s.Table}>
                        <thead>
                            <tr>
                                <th>F.I.O</th>
                                <th>Xizmat</th>
                                <th>Narxi</th>
                                <th>{tab === 'paid' ? "To'langan vaqt" : 'Sana'}</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((v) => (
                                <tr
                                    key={v.id}
                                    onClick={() => {
                                        if (!v.isPaid) {
                                            setSelected(v);
                                            setPaidService(null);
                                            setFormError('');
                                        }
                                    }}
                                    style={v.isPaid ? { cursor: 'default' } : undefined}
                                >
                                    <td>
                                        <div className={s.NameCell}>
                                            <div className={s.Avatar}>{v.initial}</div>
                                            <div>
                                                <span>{v.name}</span>
                                                {v.phone && (
                                                    <p className={s.NameCellSub}>{v.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{v.serviceName}</td>
                                    <td className={v.isPaid ? '' : s.DebtCell}>
                                        {formatSum(v.price)}
                                    </td>
                                    <td>{formatDateTime(v.isPaid ? v.paidAt : v.createdAt)}</td>
                                    <td>
                                        <span
                                            className={`${s.StatusBadge} ${v.isPaid ? s.paid : s.unpaid
                                                }`}
                                        >
                                            {v.isPaid ? "To'langan" : "To'lanmagan"}
                                        </span>
                                    </td>
                                    <td className={s.ArrowCell}>
                                        {v.isPaid ? (
                                            <button
                                                type="button"
                                                title="Chekni chop etish"
                                                className={s.LinkBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    printServiceReceipt(v);
                                                }}
                                            >
                                                <i className="bi bi-printer"></i>
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

            {/* TO'LOV OYNASI */}
            <Modal isOpen={!!selected} onClose={closeDrawer} side="right">
                {selected && (
                    <>
                        <div className={s.DrawerHead}>
                            <div className={s.DrawerAvatar}>{selected.initial}</div>
                            <div>
                                <h2>{selected.name}</h2>
                                <p>{selected.phone || '—'}</p>
                            </div>
                        </div>

                        {paidService ? (
                            /* TO'LOV QABUL QILINDI -> chek tugmasi */
                            <div className={s.DrawerBody}>
                                <div className={s.AllPaidBox}>
                                    <i className="bi bi-check-circle-fill"></i>
                                    <p>
                                        To'lov qabul qilindi · {formatSum(paidService.price)}
                                    </p>
                                </div>

                                {/* <button
                                    type="button"
                                    className={s.PayBtn}
                                    onClick={() => printServiceReceipt(paidService)}
                                >
                                    <i className="bi bi-printer"></i>
                                    Chekni chop etish
                                </button> */}
                                <button
                                    type="button"
                                    className={s.PayBtn}>
                                    Chekni chop etish
                                </button>
                                <button
                                    type="button"
                                    className={`${s.LinkBtn} ${s.CloseBtn}`}
                                    onClick={closeDrawer}
                                >
                                    Yopish
                                </button>
                            </div>
                        ) : (
                            <div className={s.DrawerBody}>
                                <div className={s.AmountBox}>
                                    <span className={s.AmountLabel}>
                                        To'lanadigan summa
                                    </span>
                                    <strong className={s.AmountValue}>
                                        {formatSum(selected.price)}
                                    </strong>
                                </div>

                                <p className={s.DrawerSectionTitle}>Xizmat(lar)</p>
                                <p className={s.InfoText}>{selected.serviceName}</p>

                                <p className={s.DrawerSectionTitle}>Xizmat sanasi</p>
                                <p className={s.InfoText}>
                                    {formatDateTime(selected.createdAt)}
                                </p>

                                {formError && (
                                    <p className={s.FormError}>
                                        <i className="bi bi-exclamation-circle-fill"></i>{' '}
                                        {formError}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className={s.PayBtn}
                                    onClick={handlePay}
                                    disabled={paying}
                                >
                                    <i className="bi bi-wallet2"></i>
                                    {paying
                                        ? 'Qabul qilinmoqda...'
                                        : `To'lovni qabul qilish · ${formatSum(
                                            selected.price
                                        )}`}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default CashierServicesPayments;