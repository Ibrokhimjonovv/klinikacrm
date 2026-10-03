import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import s from './NurseServiceDetail.module.scss';
import { api } from '../../../App'; // yo'lni loyihangizga moslang
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../context/context';
import Loading from '../../../components/Loading/Loading';
import Modal from '../../../components/Modal/Modal';
import ServicePatientAdd from '../../../components/shared/ServicePatientAdd/ServicePatientAdd';
import PrintReceipt, { logoReady } from '../../../components/shared/PrintReceipt/PrintReceipt';
import Pagination from '../../../components/shared/Pagination/Pagination';
import usePagination from '../../../components/shared/Pagination/usePagination';

// ⚠️ API manzillarini backend'ingizga moslang
const SERVICES_PATH = '/services/';        // GET  /services/:id/
const ASSIGN_PATH = '/examination-requests/direct/';  // POST { patient, service }

const WAITING_TEXT = 'Kutilmoqda';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Yangi qo'shilgan bemorda `name` bo'lmasligi mumkin — F.I.O dan yig'amiz
const getName = (p) =>
  p?.name ||
  [p?.first_name, p?.last_name, p?.middle_name].filter(Boolean).join(' ');

// Shifokor yorlig'i: "Kutilmoqda Kutilmoqda" kabi takrorlarni bitta qilamiz
const getDoctor = (p) => {
  const parts = [p?.doctor_name, p?.doctor_surename].filter(Boolean);
  const unique = parts.filter((x, i) => parts.indexOf(x) === i);
  const label = unique.join(' ').trim();
  const waiting =
    !label ||
    p?.doctor === WAITING_TEXT ||
    unique.some((x) => x === WAITING_TEXT);
  return { label: waiting ? WAITING_TEXT : label, waiting };
};

const formatSum = (n) =>
  Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const NurseServiceDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  // Bemorlar — NursePatients'dagi kabi context'dan
  const {
    patients,
    patientsLoading,
    patientsError,
    fetchPatients,
  } = useAppContext();

  const [service, setService] = useState(null);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceError, setServiceError] = useState(null);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [newPatient, setNewPatient] = useState(null); // oxirgi qo'shilgan bemor
  const [showAdd, setShowAdd] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ✅ YANGI: oxirgi muvaffaqiyatli biriktirish — chek shundan chiqariladi.
  // (`selected` biriktirishdan keyin tozalanadi, shuning uchun alohida saqlaymiz)
  const [assigned, setAssigned] = useState(null); // { patient, requestId }

  const getToken = () => localStorage.getItem('hospital_access');

  // Bemorlar ro'yxati bo'sh bo'lsagina qayta so'raymiz
  useEffect(() => {
    if (patients.length === 0) {
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xizmat ma'lumoti
  useEffect(() => {
    const loadService = async () => {
      try {
        setServiceLoading(true);
        setServiceError(null);
        const res = await fetch(`${api}${SERVICES_PATH}${serviceId}/`, {
          headers: authHeaders(getToken()),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        setService(await res.json());
      } catch (err) {
        console.error('Xizmatni olishda xatolik:', err);
        setServiceError(err.message);
      } finally {
        setServiceLoading(false);
      }
    };
    loadService();
  }, [serviceId]);

  // Ro'yxatda hali bo'lmasa ham yangi bemor ro'yxatda chiqishi uchun
  const displayPatients = useMemo(() => {
    if (!newPatient) return patients;
    const exists = patients.some((p) => String(p.id) === String(newPatient.id));
    return exists ? patients : [newPatient, ...patients];
  }, [patients, newPatient]);

  // Yuqoridagi "oxirgi qo'shilgan" blok uchun (ro'yxatdagi to'liqroq versiyasi bo'lsa — o'shani olamiz)
  const newPatientFull = useMemo(() => {
    if (!newPatient) return null;
    return (
      patients.find((p) => String(p.id) === String(newPatient.id)) || newPatient
    );
  }, [patients, newPatient]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayPatients;
    return displayPatients.filter(
      (p) =>
        getName(p).toLowerCase().includes(q) ||
        (p.complaint || '').toLowerCase().includes(q)
    );
  }, [displayPatients, search]);
  const {
    pageItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
  } = usePagination(filtered, 100);

  // Yangi bemor yaratilganda — yuqorida ko'rsatamiz va avtomatik tanlaymiz
  const handleCreated = (patient) => {
    setFormError('');
    setFormSuccess('');
    setAssigned(null);
    setNewPatient(patient);
    setSelected(patient);
  };

  const togglePatient = (p) => {
    setFormError('');
    setFormSuccess('');
    setAssigned(null); // yangi bemor tanlansa, eski chek yashiriladi
    setSelected(selected?.id === p.id ? null : p);
  };

  const handleAssign = async () => {
    if (!selected) {
      setFormError('Avval bemorni tanlang');
      return;
    }
    try {
      setAssigning(true);
      setFormError('');
      setFormSuccess('');
      setAssigned(null);

      const res = await fetch(`${api}${ASSIGN_PATH}`, {
        method: 'POST',
        headers: authHeaders(getToken()),
        body: JSON.stringify({ patient: selected.id, service: Number(serviceId) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || `HTTP error! status: ${res.status}`);
      }

      setFormSuccess(`${getName(selected)} xizmatga biriktirildi`);
      // Chek uchun bemor va (backend qaytarsa) so'rov ID'sini saqlaymiz
      setAssigned({ patient: selected, requestId: data?.id || null });
      setSelected(null);
    } catch (err) {
      console.error('Biriktirishda xatolik:', err);
      setFormError(err.message || "Bemorni biriktirib bo'lmadi");
    } finally {
      setAssigning(false);
    }
  };

  // ✅ YANGI: chek chop etish — logotip yuklanib bo'lishini kutib, keyin print
  const handlePrint = async () => {
    await logoReady;
    window.print();
  };

  // Bitta bemor qatori (yuqori blokda ham, ro'yxatda ham ishlatiladi)
  const renderPatientRow = (p) => {
    const isSelected = selected?.id === p.id;
    const doctor = getDoctor(p);
    return (
      <button
        type="button"
        className={`${s.PatientRow} ${isSelected ? s.PatientRowSelected : ''}`}
        onClick={() => togglePatient(p)}
      >
        <div className={s.PatientLeft}>
          <div className={s.Avatar}>{getName(p)[0] || '?'}</div>
          <div className={s.PatientInfo}>
            <p>{getName(p)}</p>
            {/* <span className="truncate">{p.complaint}</span> */}
          </div>
        </div>
        <div className={s.PatientRight}>
          {p.time && (
            <DateTimeFormatter date={p.time} format="datetime" className={s.Time} />
          )}
          <span className={`${s.DoctorBadge} ${doctor.waiting ? s.waiting : ''}`}>
            {doctor.label}
          </span>
          {isSelected ? (
            <i className={`bi bi-check-circle-fill ${s.CheckIcon}`}></i>
          ) : (
            <i className={`bi bi-circle ${s.CircleIcon}`}></i>
          )}
        </div>
      </button>
    );
  };

  if (patientsLoading || serviceLoading) return <Loading />;
  if (patientsError) return <p>{patientsError}</p>;
  if (serviceError) return <p>Xizmatni yuklashda xatolik: {serviceError}</p>;

  // Chek ma'lumotlari — bemor sahifalaridagi maydon nomlari turlicha bo'lishi mumkin
  const receiptPatient = assigned?.patient;
  const receiptInfo = receiptPatient
    ? [
      { label: 'Xizmat', value: service?.name },
      { label: 'Narxi', value: formatSum(service?.price) },
      { label: 'Telefon', value: receiptPatient.contact_number || receiptPatient.phone },
      { label: "Tug'ilgan sana", value: receiptPatient.date_of_birth || receiptPatient.birth_date },
    ].filter((row) => row.value)
    : [];

  return (
    <div className={s.HomeContainer}>
      <div className={s.TopRow}>
        <div>
          <button type="button" className={s.BackBtn} onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Xizmatlar
          </button>
          <h1>{service?.name}</h1>
          <p className={s.PriceLine}>
            <span>{formatSum(service?.price)}</span>
          </p>
        </div>

        {/* Bemor topilmasa — yangi bemor qo'shish */}
        <button type="button" className={s.AddPatientBtn} onClick={() => setShowAdd(true)}>
          <i className="bi bi-person-plus"></i>
          Yangi bemor qo'shish
        </button>
      </div>

      <div className={s.ListCard}>
        {/* OXIRGI QO'SHILGAN BEMOR — ro'yxatdan oldin */}
        {newPatientFull && (
          <div className={s.NewPatientBox}>
            <p className={s.NewPatientTitle}>
              <i className="bi bi-stars"></i> Oxirgi qo'shilgan bemor
            </p>
            {renderPatientRow(newPatientFull)}
          </div>
        )}

        <div className={s.ListHead}>
          <div className={s.ListHeadLeft}>
            <h3>Bemorlar ro'yxati</h3>
            <span className={s.CountBadge}>{filtered.length} ta</span>
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
          <p className={s.Empty}>Bemor topilmadi</p>
        ) : (
          <ul>
            {pageItems.map((p) => (
              <li key={p.id}>{renderPatientRow(p)}</li>
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

        {formError && (
          <p className={s.FormError}>
            <i className="bi bi-exclamation-circle-fill"></i> {formError}
          </p>
        )}

        {/* ✅ Muvaffaqiyat xabari + chek tugmasi — biriktirish tugmasi yonida */}
        {formSuccess && (
          <div className={s.SuccessRow}>
            <p className={s.FormSuccess}>
              <i className="bi bi-check-circle-fill"></i> {formSuccess}
            </p>
            {assigned && (
              <button type="button" className={s.PrintBtn} onClick={handlePrint}>
                <i className="bi bi-printer"></i> Chek chop etish
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className={s.AssignBtn}
          onClick={handleAssign}
          disabled={!selected || assigning}
        >
          <i className="bi bi-link-45deg"></i>
          {assigning
            ? 'Biriktirilmoqda...'
            : selected
              ? `${getName(selected)} ni biriktirish`
              : 'Bemorni tanlang'}
        </button>
      </div>

      {/* YANGI BEMOR QO'SHISH MODALI */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <ServicePatientAdd
          onCreated={handleCreated}
          onClose={() => setShowAdd(false)}
        />
      </Modal>

      {/* CHOP ETISH SHABLONI — ekranda ko'rinmaydi, faqat print paytida chiqadi */}
      {assigned &&
        createPortal(
          <div className="print-root">
            <PrintReceipt
              title="Xizmat varaqasi"
              patientName={getName(receiptPatient)}
              patientInfo={receiptInfo}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export default NurseServiceDetail;