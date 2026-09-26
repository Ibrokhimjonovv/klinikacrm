import React, { useEffect } from 'react';
import s from "./NursePatients.module.scss"
import { Link } from 'react-router-dom';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../context/context';
import Loading from '../../../components/Loading/Loading';

const NursePatients = () => {
    const {
        patients: todayAdmissions,
        patientsLoading: loading,
        patientsError: error,
        fetchPatients,
    } = useAppContext();

    useEffect(() => {
        // faqat ro'yxat bo'sh bo'lsa qayta so'rov yuborish (ixtiyoriy optimallashtirish)
        if (todayAdmissions.length === 0) {
            fetchPatients();
        }
    }, []);

    if (loading) return <Loading />;
    if (error) return <p>{error}</p>;

    return (
        <div className={s.ListCard}>
            <div className={s.ListHead}>
                <h3>Bemorlar ro'yxati</h3>
                <span className={s.CountBadge}>{todayAdmissions.length} ta</span>
            </div>

            {todayAdmissions.length === 0 ? (
                <p className={s.Empty}>Bugun hali hech kim qabul qilinmagan</p>
            ) : (
                <ul>
                    {todayAdmissions.map((p) => (
                        <li key={p.id}>
                            <Link to={`/nurse-patients/${p.id}`}>
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
        </div>
    )
}

export default NursePatients