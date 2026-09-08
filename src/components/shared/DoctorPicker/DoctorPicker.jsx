import React, { useState, useEffect } from 'react';
import s from './DoctorPicker.module.scss';
import Loading from '../../Loading/Loading';
import { api } from '../../../App';

const DoctorPicker = ({ selected = [], onChange, disabled }) => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDoctors = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('hospital_access');
                const res = await fetch(`${api}/doctors/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await res.json();

                if (!res.ok) {
                    setError('Shifokorlar ro\'yxatini yuklashda xatolik yuz berdi');
                    return;
                }

                setDoctors(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                setError('Serverga ulanishda xatolik yuz berdi');
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    const toggle = (id) => {
        if (disabled) return;
        if (selected.includes(id)) {
            onChange(selected.filter(x => x !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    if (loading) {
        return (
            <div className={s.LoadingWrap}>
                <Loading />
            </div>
        );
    }

    if (error) {
        return <p className={s.ErrorText}>{error}</p>;
    }

    if (doctors.length === 0) {
        return <p className={s.Empty}>Shifokorlar topilmadi</p>;
    }

    return (
        <div className={s.Grid}>
            {doctors.map(d => {
                const isSelected = selected.includes(d.id);
                const initials = `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase();

                return (
                    <div
                        key={d.id}
                        className={`${s.Card} ${isSelected ? s.Selected : ''}`}
                        onClick={() => toggle(d.id)}
                    >
                        {isSelected && (
                            <div className={s.CheckBadge}>
                                <i className="bi bi-check-lg"></i>
                            </div>
                        )}

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
    );
};

export default DoctorPicker;