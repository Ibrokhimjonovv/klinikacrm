import React, { useState, useEffect } from 'react';
import s from './VisitDetail.module.scss';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../App';
import Loading from '../../../components/Loading/Loading';
import { Link } from 'react-router-dom';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const VISIT_STATUS_LABELS = {
    WAITING: 'Kutmoqda',
    IN_PROGRESS: 'Jarayonda',
    DONE: 'Tugallangan',
};

const VisitDetail = () => {
    const { visitId } = useParams();
    const navigate = useNavigate();

    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchVisit = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('hospital_access');

                const res = await fetch(`${api}/visitInfo/${visitId}/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!res.ok) {
                    if (res.status === 404) throw new Error('Shikoyat topilmadi');
                    throw new Error("Ma'lumotni yuklashda xatolik yuz berdi");
                }

                const json = await res.json();

                // data doim massiv — birinchi elementini olamiz
                const visitData = Array.isArray(json.data) ? json.data[0] : null;

                if (!visitData) {
                    setError('Shikoyat topilmadi');
                    setLoading(false);
                    return;
                }

                // doctors endi to'liq obyektlar massivi — to'g'ridan-to'g'ri ishlatamiz
                setVisit({ ...visitData, doctorDetails: visitData.doctors || [] });
                setLoading(false);
            } catch (err) {
                setError(err.message || 'Xatolik yuz berdi');
                setLoading(false);
            }
        };

        if (visitId) fetchVisit();
    }, [visitId]);

    if (loading) {
        return (
            <div className={s.DetailPage}>
                <div className={s.LoadingWrapper}>
                    <Loading />
                    <p>Yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    if (error || !visit) {
        return (
            <div className={s.NotFoundBox}>
                <i className="bi bi-exclamation-triangle-fill"></i>
                <p>{error || 'Shikoyat topilmadi'}</p>
                <button onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left"></i> Orqaga qaytish
                </button>
            </div>
        );
    }

    const statusKey = (visit.status || 'WAITING').toLowerCase();

    return (
        <div className={s.DetailPage}>
            <div className={s.BackBtn}>
                <Link to="/nurse-patients" className={s.NotActive}>Bemorlar ro'yxati</Link> / <Link to={`/nurse-patients/${visit.patient.id}`} className={s.NotActive}>{visit.patient.first_name} {visit.patient.last_name}</Link> / <span>Shikoyat</span>
            </div>

            <div className={s.HeaderCard}>
                <h1><i className="bi bi-file-medical"></i> Shikoyat tafsilotlari</h1>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <span className={`${s.StatusBadge} ${s[statusKey]}`}>
                        {VISIT_STATUS_LABELS[visit.status] || visit.status}
                    </span>
                    <span className={`${s.StatusBadge} ${s['waiting']}`} style={{ display: 'flex', gap: '3px' }}>
                        <i className="bi bi-clock-history"></i>
                        {/* {new Date(visit.created_at).toLocaleString('uz-UZ')} */}
                        <DateTimeFormatter
                            date={visit.created_at}
                            format="datetime"
                            className={s.Time}
                        />
                    </span>
                </div>
            </div>

            <div className={s.Block}>
                <h3>Shikoyat</h3>
                <p className={s.ComplaintText}>{visit.complaint}</p>
            </div>

            {visit.notes && (
                <div className={s.Block}>
                    <h3>Qo'shimcha izoh</h3>
                    <p className={s.NotesText}>{visit.notes}</p>
                </div>
            )}

            <div className={s.Block}>
                <h3>Biriktirilgan shifokorlar</h3>
                {/* {visit.doctorDetails.length === 0 ? (
                    <p className={s.Empty}>Shifokor biriktirilmagan</p>
                ) : (
                    <div className={s.DoctorsGrid}>
                        {visit.doctorDetails.map(d => (
                            <div key={d.id} className={s.DoctorCard}>
                                <div className={s.Avatar}>
                                    {`${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase()}
                                </div>
                                <div>
                                    <p>{d.first_name} {d.last_name}</p>
                                    {d.specialty && <span>{d.specialty}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )} */}

                <div className={s.Grid}>
                    {visit.doctorDetails.map(d => {
                        const initials = `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase();

                        return (
                            <div
                                key={d.id}
                                className={`${s.Card}`}
                            >
                                <div className={s.CheckBadge}>
                                    <i className="bi bi-check-lg"></i>
                                </div>

                                <div className={s.DocProf}>
                                    <div className={s.Avatar}>{initials}</div>

                                    <div className={s.DocData}>
                                        <p className={s.Name}>
                                            {d.first_name?.charAt(0)}. {d.middle_name}
                                        </p>
                                        {d.specialty && <span className={s.Specialty}>{d.specialty}</span>}
                                    </div>
                                </div>


                                <div className={s.MetaRow}>
                                    {d.department && (
                                        <span><i className="bi bi-building"></i> {d.department}</span>
                                    )}
                                    {d.experience_years != null && (
                                        <span><i className="bi bi-award"></i> {d.experience_years} yil</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VisitDetail;