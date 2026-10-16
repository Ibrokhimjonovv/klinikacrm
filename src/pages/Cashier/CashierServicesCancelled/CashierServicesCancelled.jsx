import React, { useEffect, useMemo, useState } from 'react';
import s from '../CashierServicesPayments/CashierServicesPayments.module.scss';
import x from './CashierServicesCancelled.module.scss';
import { api } from '../../../App';
const CANCELLED_PATH = '/direct-services/cancelled/';
const restorePath = (id) => `/direct-services/${id}/restore/`;

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

const normalize = (v) => {
    const p = typeof v.patient === 'object' && v.patient ? v.patient : {};

    const name =
        [p.first_name, p.last_name, p.middle_name].filter(Boolean).join(' ') ||
        v.patient_name ||
        v.patient_full_name ||
        `Bemor #${typeof v.patient === 'object' ? p.id ?? '?' : v.patient ?? '?'}`;

    const services = (v.services || v.service_items || [])
        .map((item) =>
            typeof item === 'object'
                ? item.name || item.service_name || item.title
                : item
        )
        .filter(Boolean);

    const serviceName =
        v.service_name ||
        v.service_title ||
        (typeof v.service === 'object' && v.service ? v.service.name : v.service) ||
        (services.length ? services.join(', ') : '—');

    return {
        id: v.id ?? v.service_id,
        name,
        initial: name[0] || '?',
        phone: p.contact_number || v.contact_number || '',
        serviceName,
        price: Number(v.price || v.amount) || 0,
        queueNumber: v.queue_number ?? v.queueNumber ?? null,
        reason: v.cancel_reason || v.cancelled_reason || v.note || '',
        createdAt: v.created_at || v.date || v.service_date,
        cancelledAt: v.cancelled_at || v.updated_at || v.created_at,
    };
};

const CashierServicesCancelled = () => {
    const [search, setSearch] = useState('');
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [restoringId, setRestoringId] = useState(null);
    const [actionError, setActionError] = useState('');

    const getToken = () => localStorage.getItem('hospital_access');

    const fetchCancelled = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);

            const res = await fetch(`${api}${CANCELLED_PATH}`, {
                headers: authHeaders(getToken()),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.results || [];
            setList(arr.map(normalize));
        } catch (err) {
            console.error('Bekor qilinganlarni olishda xatolik:', err);
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCancelled();
    }, []);

    const handleRestore = async (item) => {
        if (!window.confirm(`"${item.name}" xizmatini qayta tiklaysizmi?`)) return;

        try {
            setRestoringId(item.id);
            setActionError('');

            const res = await fetch(`${api}${restorePath(item.id)}`, {
                method: 'POST',
                headers: authHeaders(getToken()),
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    data.detail || data.error || `HTTP error! status: ${res.status}`
                );
            }

            await fetchCancelled(true);
        } catch (err) {
            console.error('Tiklashda xatolik:', err);
            setActionError(err.message || "Xizmatni tiklab bo'lmadi");
        } finally {
            setRestoringId(null);
        }
    };

    const filtered = useMemo(
        () =>
            list.filter(
                (v) =>
                    v.name.toLowerCase().includes(search.toLowerCase()) ||
                    v.serviceName.toLowerCase().includes(search.toLowerCase())
            ),
        [list, search]
    );

    const totalCancelled = list.reduce((a, v) => a + v.price, 0);

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

    return (
        <div className={s.PatientsPage}>
            <div className={s.TopRow}>
                <div>
                    <h1>Bekor qilingan xizmatlar</h1>
                    <p>To'lovi bekor qilingan bemorlar ro'yxati</p>
                </div>
            </div>

            {/* STATISTIKA */}
            <div className={x.StatsRow2}>
                <div className={s.StatCard}>
                    <div className={`${s.StatIcon} ${s.StatIconRed}`}>
                        <i className="bi bi-x-circle"></i>
                    </div>
                    <div>
                        <span>Bekor qilinganlar soni</span>
                        <p>{list.length} ta</p>
                    </div>
                </div>
                <div className={s.StatCard}>
                    <div className={`${s.StatIcon} ${x.StatIconGray}`}>
                        <i className="bi bi-cash-coin"></i>
                    </div>
                    <div>
                        <span>Bekor qilingan summa</span>
                        <p>{formatSum(totalCancelled)}</p>
                    </div>
                </div>
            </div>

            {/* QIDIRUV */}
            <div className={s.SearchRow}>
                <div className={s.SearchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Bemor yoki xizmat bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {actionError && (
                <p className={s.FormError}>
                    <i className="bi bi-exclamation-circle-fill"></i> {actionError}
                </p>
            )}

            {filtered.length === 0 && (
                <p className={s.Empty}>Bekor qilingan xizmat topilmadi</p>
            )}

            {/* JADVAL */}
            {filtered.length > 0 && (
                <div className={s.TableWrap}>
                    <table className={s.Table}>
                        <thead>
                            <tr>
                                <th>F.I.O</th>
                                <th>Xizmat</th>
                                <th>Narxi</th>
                                <th>Xizmat sanasi</th>
                                <th>Bekor qilingan vaqt</th>
                                <th>Holati</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((v) => (
                                <tr key={v.id} style={{ cursor: 'default' }}>
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
                                    <td>
                                        {v.serviceName}
                                        {v.reason && (
                                            <p className={s.NameCellSub}>Sabab: {v.reason}</p>
                                        )}
                                    </td>
                                    <td className={x.PriceCell}>{formatSum(v.price)}</td>
                                    <td>{formatDateTime(v.createdAt)}</td>
                                    <td>{formatDateTime(v.cancelledAt)}</td>
                                    <td>
                                        <span className={`${s.StatusBadge} ${x.Cancelled}`}>
                                            Bekor qilingan
                                        </span>
                                    </td>
                                    <td className={s.ArrowCell}>
                                        <button
                                            type="button"
                                            title="Qayta tiklash"
                                            className={s.LinkBtn}
                                            disabled={restoringId === v.id}
                                            onClick={() => handleRestore(v)}
                                        >
                                            <i className="bi bi-arrow-counterclockwise"></i>{' '}
                                            {restoringId === v.id ? '...' : 'Tiklash'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CashierServicesCancelled;