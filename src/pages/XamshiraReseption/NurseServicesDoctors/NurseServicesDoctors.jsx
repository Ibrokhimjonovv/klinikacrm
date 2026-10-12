import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './NurseServicesDoctors.module.scss';
import { api } from '../../../App'; // yo'lni loyihangizga moslang

const DOCTORS_PATH = '/assist-doctors/';
// Shifokor xizmatlari sahifasi marshruti (App'dagi Route bilan bir xil bo'lsin)
const doctorServicesRoute = (id) => `/nurse/doctor/${id}/services`;

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const doctorName = (d) =>
  d.full_name ||
  [d.first_name, d.last_name].filter(Boolean).join(' ') ||
  d.username ||
  `Shifokor #${d.id}`;

const NurseServicesDoctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${api}${DOCTORS_PATH}`, {
          headers: authHeaders(localStorage.getItem('hospital_access')),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setDoctors(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error('Shifokorlarni olishda xatolik:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      doctors.filter((d) =>
        doctorName(d).toLowerCase().includes(search.toLowerCase())
      ),
    [doctors, search]
  );

  if (loading) return <p>Shifokorlar yuklanmoqda...</p>;
  if (error) return <p>Shifokorlarni yuklashda xatolik: {error}</p>;

  return (
    <div className={s.HomeContainer}>
      <div className={s.TopRow}>
        <div>
          <h1>Shifokorlar</h1>
          <p>Shifokorni tanlang, uning xizmatlari ko'rsatiladi</p>
        </div>

        <div className={s.SearchBox}>
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Shifokor ismi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={s.Empty}>Shifokor topilmadi</p>
      ) : (
        <div className={s.DoctorsGrid}>
          {filtered.map((d) => {
            const name = doctorName(d);
            return (
              <button
                type="button"
                key={d.id}
                className={s.DoctorCard}
                onClick={() => navigate(doctorServicesRoute(d.id))}
              >
                <div className={s.DoctorAvatar}>{name[0] || '?'}</div>
                <div className={s.DoctorInfo}>
                  <h3>{name}</h3>
                  {(d.specialty || d.specialization) && (
                    <p>{d.specialty || d.specialization}</p>
                  )}
                </div>
                <i className="bi bi-chevron-right"></i>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NurseServicesDoctors;