import React, { useEffect, useMemo, useState } from 'react';
import s from "./NursePatients.module.scss"
import { Link } from 'react-router-dom';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../context/context';
import Loading from '../../../components/Loading/Loading';
import usePagination from '../../../components/shared/Pagination/usePagination';
import Pagination from '../../../components/shared/Pagination/Pagination';

const NursePatients = () => {
    const {
        patients: todayAdmissions,
        patientsLoading: loading,
        patientsError: error,
        fetchPatients,
    } = useAppContext();

    const [search, setSearch] = useState('');

    // Ism bo'yicha qidirish — pagination'ga FILTRLANGAN ro'yxat beriladi
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return todayAdmissions;
        return todayAdmissions.filter((p) =>
            (p.name || '').toLowerCase().includes(q)
        );
    }, [todayAdmissions, search]);

    // Hooklar shartli return'lardan OLDIN chaqirilishi kerak
    const {
        pageItems,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
    } = usePagination(filtered, 100); // default: 100 tadan

    useEffect(() => {
        // faqat ro'yxat bo'sh bo'lsa qayta so'rov yuborish (ixtiyoriy optimallashtirish)
        if (todayAdmissions.length === 0) {
            fetchPatients();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <Loading />;
    if (error) return <p>{error}</p>;

    return (
        <div className={s.ListCard}>
            <div className={s.ListHead}>
                <div className={s.ListHeadLeft}>
                    <h3>Bemorlar ro'yxati</h3>
                    <span className={s.CountBadge}>{total} ta</span>
                </div>

                <div className={s.SearchBox}>
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Bemor ismi bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {total === 0 ? (
                <p className={s.Empty}>
                    {search.trim()
                        ? 'Bemor topilmadi'
                        : 'Bugun hali hech kim qabul qilinmagan'}
                </p>
            ) : (
                <ul>
                    {pageItems.map((p) => (
                        <li key={p.id}>
                            <Link to={`/nurse/patients/patient/${p.id}`}>
                                <div className={s.PatientLeft}>
                                    <div className={s.Avatar}>{p.name ? p.name[0] : '?'}</div>
                                    <div className={s.PatientInfo}>
                                        <p>{p.name}</p>
                                        <span className="truncate">{p.complaint}</span>
                                    </div>
                                </div>
                                <div className={s.PatientRight}>
                                    <DateTimeFormatter date={p.time} format="datetime" className={s.Time} />
                                    <span className={s.DoctorBadge}>
                                        {p.doctor_name} {p.doctor_surename}
                                    </span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <Pagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />
        </div>
    )
}

export default NursePatients