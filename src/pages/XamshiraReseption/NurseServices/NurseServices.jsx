import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './NurseServices.module.scss';
import { api } from '../../../App'; // yo'lni loyihangizga moslang

// ⚠️ Moslang
const SERVICES_PATH = '/services/';
// Xizmatning ichki sahifasi marshruti (App'dagi <Route path=".../:serviceId" /> bilan bir xil bo'lsin)
const serviceRoute = (id) => `/nurse/services/${id}`;

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const formatSum = (n) =>
  Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const NurseServices = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${api}${SERVICES_PATH}`, {
          headers: authHeaders(localStorage.getItem('hospital_access')),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setServices(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error('Xizmatlarni olishda xatolik:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      services.filter((sv) =>
        (sv.name || '').toLowerCase().includes(search.toLowerCase())
      ),
    [services, search]
  );

  if (loading) return <p>Xizmatlar yuklanmoqda...</p>;
  if (error) return <p>Xizmatlarni yuklashda xatolik: {error}</p>;

  return (
    <div className={s.HomeContainer}>
      <div className={s.TopRow}>
        <div>
          <h1>Xizmatlar</h1>
          <p>Xizmatni tanlang va bemorni biriktiring</p>
        </div>

        <div className={s.SearchBox}>
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Xizmat nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={s.Empty}>Xizmat topilmadi</p>
      ) : (
        <div className={s.ServicesGrid}>
          {filtered.map((sv) => (
            <button
              type="button"
              key={sv.id}
              className={s.ServiceCard}
              onClick={() => navigate(serviceRoute(sv.id))}
            >
              <div className={s.ServiceIcon}>
                <i className="bi bi-heart-pulse"></i>
              </div>
              <h3>{sv.name}</h3>
              {sv.description && <p className={s.ServiceDesc}>{sv.description}</p>}
              <div className={s.ServiceFooter}>
                <span className={s.ServicePrice}>{formatSum(sv.price)}</span>
                <i className="bi bi-chevron-right"></i>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NurseServices;