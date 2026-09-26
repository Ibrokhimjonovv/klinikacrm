import React, { useState, useEffect } from 'react';
import s from "./PatientDetail.module.scss"
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../../App';
import Loading from '../../../components/Loading/Loading';
import Modal from '../../../components/Modal/Modal';
import PatientEdit from '../../../components/XamshiraReseption/NursePatientEdit/PatientEdit';
import EditVisit from '../../../components/XamshiraReseption/EditVisit/EditVisit';
import AddVisit from '../../../components/XamshiraReseption/AddVisit/AddVisit';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';
import { useAppContext } from '../../../context/context';
import { createPortal, flushSync } from 'react-dom';
import PrintReceipt, { logoReady } from '../../../components/shared/PrintReceipt/PrintReceipt';

const calcAge = (birthDate) => {
    if (!birthDate) return 'Noma\'lum';
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

// const STATUS_OPTIONS = ['Faol', 'Kuzatuvda', 'Tugallangan'];

// const VISIT_STATUS_LABELS = {
//     WAITING: 'Kutmoqda',
//     IN_PROGRESS: 'Jarayonda',
//     DONE: 'Tugallangan',
// };

const NursePatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { removePatientLocally } = useAppContext();

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [visits, setVisits] = useState([]);
    const [visitsLoading, setVisitsLoading] = useState(true);
    const [visitsError, setVisitsError] = useState('');

    // const [status, setStatus] = useState('Faol');
    // const [statusOpen, setStatusOpen] = useState(false);
    // const [statusSaving, setStatusSaving] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    // Eskisini o'chiring: const [selectedVisitId, setSelectedVisitId] = useState(null);
    const [showEditVisitModal, setShowEditVisitModal] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);

    const [showAddVisitModal, setShowAddVisitModal] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Tashxisni o'chirish uchun
    const [visitToDelete, setVisitToDelete] = useState(null);
    const [deletingVisit, setDeletingVisit] = useState(false);

    const [printTarget, setPrintTarget] = useState(null);

    const DEMO_CREDENTIALS = { username: 'xxxxxxxx', password: 'xxxxxxxx' };

    const latestVisit = visits.length
        ? visits.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a))
        : null;

    const handlePrint = async (visit = null) => {
        // Logotip brauzer xotirasida tayyor bo'lguncha kutamiz — aks holda
        // (bu chek birinchi marta chiqarilayotgani uchun) print() logotip
        // hali yuklanmasdan turib chaqirilib qolishi mumkin edi.
        await logoReady;
        // chek DOM'ga chiqib bo'lgandan keyingina print ochilishi uchun
        flushSync(() => setPrintTarget({ visit }));
        window.print();
    };

    const fetchPatient = async () => {
        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('hospital_access');

            const response = await fetch(`${api}/patientInfo/${id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error('Bemor topilmadi');
                if (response.status === 401) throw new Error('Sessiya muddati tugagan. Iltimos qayta kiring.');
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const formattedPatient = {
                id: data.id,
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                middle_name: data.middle_name || '',
                date_of_birth: data.date_of_birth || '',
                gender: data.gender || '',
                contact_number: data.contact_number || '',
                address: data.address || '',
                // status: data.status || 'Faol',
                create_date: data.create_date || '',
            };

            setPatient(formattedPatient);
            // setStatus(formattedPatient.status);
            setLoading(false);
        } catch (err) {
            console.error('Bemorni yuklashda xatolik:', err);
            setError(err.message || "Bemor ma'lumotlarini yuklashda xatolik yuz berdi");
            setLoading(false);
        }
    };

    // Tashxisni olish — javob { data: {...}, doctors: [...] } shaklida keladi
    const fetchVisits = async () => {
        try {
            setVisitsLoading(true);
            setVisitsError('');
            const token = localStorage.getItem('hospital_access');

            const response = await fetch(`${api}/medicalInfo/${id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setVisits([]);
                    setVisitsLoading(false);
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();

            // data doim massiv, doctors endi to'liq obyektlar — alohida qidirish shart emas
            const rawVisits = Array.isArray(json.data) ? json.data : [];

            const enriched = rawVisits.map(v => ({
                ...v,
                doctorNames: (v.doctors || [])
                    .map(d => `${d.first_name} ${d.last_name}`)
                    .join(', '),
            }));

            setVisits(enriched);
            setVisitsLoading(false);
        } catch (err) {
            console.error('Tashxislarni yuklashda xatolik:', err);
            setVisitsError(err.message || "Tashxislarni yuklashda xatolik yuz berdi");
            setVisitsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPatient();
            fetchVisits();
        }
    }, [id]);

    // const handleStatusChange = async (newStatus) => {
    //     setStatusOpen(false);
    //     if (newStatus === status) return;

    //     setStatusSaving(true);
    //     try {
    //         const token = localStorage.getItem('hospital_access');
    //         const formData = new FormData();
    //         formData.append('status', newStatus);

    //         const response = await fetch(`${api}/patientUpdate/${id}/`, {
    //             method: 'PATCH',
    //             headers: { 'Authorization': `Bearer ${token}` },
    //             body: formData,
    //         });

    //         if (!response.ok) throw new Error('Statusni yangilashda xatolik');

    //         setStatus(newStatus);
    //         setPatient(prev => ({ ...prev, status: newStatus }));
    //     } catch (err) {
    //         console.error('Status yangilashda xatolik:', err);
    //         alert('Statusni yangilashda xatolik yuz berdi');
    //     } finally {
    //         setStatusSaving(false);
    //     }
    // };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('hospital_access');
            const response = await fetch(`${api}/patientDelete/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error("Bemorni o'chirishda xatolik yuz berdi");

            // MUHIM: darhol Context'dagi ro'yxatdan va sondan olib tashlanadi
            removePatientLocally(Number(id));

            setShowDeleteModal(false);
            navigate('/nurse-patients', {
                state: { message: "Bemor muvaffaqiyatli o'chirildi" }
            });
        } catch (err) {
            console.error("O'chirishda xatolik:", err);
            alert(err.message || "Bemorni o'chirishda xatolik yuz berdi");
        } finally {
            setDeleting(false);
        }
    };

    // Tashxisni o'chirish
    const handleDeleteVisit = async () => {
        if (!visitToDelete) return;

        setDeletingVisit(true);
        try {
            const token = localStorage.getItem('hospital_access');
            const response = await fetch(`${api}/medicalDelete/${visitToDelete}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Tashxisni o'chirishda xatolik yuz berdi");

            setVisitToDelete(null);
            fetchVisits();
        } catch (err) {
            console.error("Tashxisni o'chirishda xatolik:", err);
            alert(err.message || "Tashxisni o'chirishda xatolik yuz berdi");
        } finally {
            setDeletingVisit(false);
        }
    };

    const openEditPatientOnly = () => {
        setShowEditModal(true);
    };

    const openEditWithVisit = (visit) => {
        setSelectedVisit(visit);
        setShowEditVisitModal(true);
    };

    const handleEditVisitSuccess = () => {
        setShowEditVisitModal(false);
        setSelectedVisit(null);
        fetchVisits();
    };

    // Tashxis ustiga bosilganda batafsil sahifaga o'tish
    const openVisitDetail = (visitId) => {
        navigate(`/nurse-patients/${id}/visits/${visitId}`);
    };

    const handleEditSuccess = () => {
        setShowEditModal(false);
        fetchPatient();
        fetchVisits();
    };

    const handleAddVisitSuccess = () => {
        setShowAddVisitModal(false);
        fetchVisits();
    };

    // const statusClass = status === 'Faol' ? s.active :
    //     status === 'Kuzatuvda' ? s.watch : s.done;

    if (loading) {
        return (
            <div className={s.DetailPage}>
                <div className={s.LoadingWrapper}>
                    <Loading />
                    <p>Bemor ma'lumotlari yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className={s.NotFoundBox}>
                <i className="bi bi-exclamation-triangle-fill"></i>
                <p>{error || 'Bemor topilmadi'}</p>
                <button onClick={() => navigate('/nurse-patients')}>
                    <i className="bi bi-arrow-left"></i> Orqaga qaytish
                </button>
            </div>
        );
    }

    const receiptPatientInfo = [
        { label: "Tug'ilgan sana", value: patient.date_of_birth },
        { label: 'Jinsi', value: patient.gender === 'erkak' ? 'Erkak' : patient.gender === 'ayol' ? 'Ayol' : '' },
        { label: 'Telefon', value: patient.contact_number },
        { label: 'Manzil', value: patient.address },
    ].filter((row) => row.value);

    return (
        <div className={s.DetailPage}>
            <div className={s.TopBar}>
                <div className={s.BackBtn}>
                    <Link to="/nurse-patients" className={s.NotActive}>Bemorlar ro'yxati</Link> / <span>{patient.first_name} {patient.last_name}</span>
                </div>

                <div className={s.ActionButtons}>
                    {/* <button className={s.PrintBtn} onClick={() => handlePrint()}>
                        <i className="bi bi-printer"></i> Chop etish
                    </button> */}
                    <button className={s.EditBtn} onClick={openEditPatientOnly}>
                        <i className="bi bi-pencil"></i> Tahrirlash
                    </button>

                    <button className={s.DeleteBtn} onClick={() => setShowDeleteModal(true)}>
                        <i className="bi bi-trash"></i> O'chirish
                    </button>
                </div>
            </div>

            <div className={s.HeaderCard}>
                <div className={s.HeaderLeft}>
                    <div className={s.Avatar}>
                        {patient.first_name ? patient.first_name[0].toUpperCase() : '?'}
                    </div>
                    <div className={s.MiniInfos}>
                        <h1>{patient.first_name} {patient.last_name} {patient.middle_name}</h1>
                        <div>
                            <p>
                                {calcAge(patient.date_of_birth)} yosh
                            </p>
                            <p>
                                {patient.gender === 'erkak' ? ' Erkak' :
                                    patient.gender === 'ayol' ? ' Ayol' : ' Noma\'lum'}
                            </p>
                        </div>
                    </div>
                </div>

                <div class={s.StatusPill}>
                    <span class={s.StatusDot}></span>
                    Bemor
                </div>

                {/* <div className={s.StatusWrap}>
                    <button
                        className={`${s.StatusBadge} ${statusClass}`}
                        onClick={() => setStatusOpen(!statusOpen)}
                        disabled={statusSaving}
                    >
                        {statusSaving ? 'Saqlanmoqda...' : status}
                        <i className="bi bi-chevron-down"></i>
                    </button>

                    {statusOpen && (
                        <div className={s.StatusDropdown}>
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    className={opt === status ? s.StatusOptionActive : ''}
                                    onClick={() => handleStatusChange(opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}
                </div> */}
            </div>

            <div className={s.InfoGrid}>
                <div className={s.InfoItem}>
                    <i className="bi bi-telephone"></i>
                    <div>
                        <span>Telefon</span>
                        <p>{patient.contact_number || "Ko'rsatilmagan"}</p>
                    </div>
                </div>
                <div className={s.InfoItem}>
                    <i className="bi bi-geo-alt"></i>
                    <div>
                        <span>Manzil</span>
                        <p>{patient.address || "Ko'rsatilmagan"}</p>
                    </div>
                </div>
                <div className={s.InfoItem}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Tug'ilgan sana</span>
                        <p><DateTimeFormatter format='date' className={s.datt} date={patient.date_of_birth} /></p>
                    </div>
                </div>
                <div className={s.InfoItem}>
                    <i className="bi bi-clock-history"></i>
                    <div>
                        <span>Ro'yxatga olingan</span>
                        <p><DateTimeFormatter format='datetime' className={s.datt} date={patient.create_date} /></p>
                    </div>
                </div>
            </div>

            {/* TASHXISLAR TARIXI */}
            <div className={s.VisitsCard}>
                <div className={s.VisitsHead}>
                    <h3><i className="bi bi-file-medical"></i> Shikoyatlar daftarchasi <span>{visits.length} ta</span></h3>
                    <button className={s.AddVisitBtn} onClick={() => setShowAddVisitModal(true)}>
                        <i className="bi bi-plus-lg"></i> Yangi shikoyat
                    </button>
                </div>

                {visitsLoading ? (
                    <div className={s.VisitsLoading}>
                        <Loading />
                    </div>
                ) : visitsError ? (
                    <p className={s.VisitsError}>{visitsError}</p>
                ) : visits.length === 0 ? (
                    <p className={s.Empty}>Hali tashxis kiritilmagan</p>
                ) : (
                    <ul className={s.VisitsList}>
                        {visits.map((v, i) => (
                            <li key={v.id || i} onClick={() => openVisitDetail(v.id)} className={s.VisitClickable}>
                                <div className={s.VisitLeft}>
                                    <div className={s.VisitInfo}>
                                        <p className="truncate">{v.complaint}</p>
                                        <span className={s.VisitMeta}>
                                            {v.doctorNames && <>Shifokor: {v.doctorNames}</>}
                                        </span>
                                    </div>
                                </div>
                                <div className={s.VisitActions}>
                                    <button
                                        className={s.VisitPrintBtn}
                                        title="Chekni chop etish"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrint(v);
                                        }}
                                    >
                                        <i className="bi bi-printer"></i>
                                    </button>
                                    <button
                                        className={s.VisitEditBtn}
                                        onClick={(e) => {
                                            e.stopPropagation(); // li'ning navigate qilishini to'xtatadi
                                            openEditWithVisit(v);
                                        }}
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <button
                                        className={s.VisitDeleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setVisitToDelete(v.id);
                                        }}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* TAHRIRLASH MODALI */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
                <PatientEdit
                    patientId={patient.id}
                    onSuccess={handleEditSuccess}
                />
            </Modal>

            <Modal isOpen={showEditVisitModal} onClose={() => setShowEditVisitModal(false)}>
                {selectedVisit && (
                    <EditVisit visit={selectedVisit} onSuccess={handleEditVisitSuccess} />
                )}
            </Modal>

            {/* YANGI SHIKOYAT QO'SHISH MODALI */}
            <Modal isOpen={showAddVisitModal} onClose={() => setShowAddVisitModal(false)}>
                <AddVisit
                    patientId={patient.id}
                    patientName={`${patient.first_name} ${patient.last_name} ${patient.middle_name || ''}`.trim()}
                    patientInfo={[
                        { label: "Tug'ilgan sana", value: patient.date_of_birth },
                        { label: 'Jinsi', value: patient.gender === 'erkak' ? 'Erkak' : 'Ayol' },
                        { label: 'Telefon', value: patient.contact_number },
                        { label: 'Manzil', value: patient.address },
                    ]}
                    onSuccess={handleAddVisitSuccess}   // ← handleSuccess emas!
                />
            </Modal>

            {/* BEMORNI O'CHIRISH MODALI */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
                <div className={s.DeleteConfirmation}>
                    <div className={s.DeleteIcon}>
                        <i className="bi bi-trash3-fill"></i>
                    </div>

                    <h2>Bemorni o'chirish</h2>

                    <p>
                        <strong>
                            {patient.first_name} {patient.last_name}
                        </strong>
                        <br />
                        ma'lumotlarini tizimdan o'chirmoqchimisiz?
                    </p>

                    <div className={s.WarningBox}>
                        <i className="bi bi-shield-exclamation"></i>
                        <span>
                            Ushbu amalni bekor qilib bo'lmaydi. Bemor va unga bog'liq
                            ma'lumotlar o'chiriladi.
                        </span>
                    </div>

                    <div className={s.DeleteButtons}>
                        <button
                            className={s.CancelBtn}
                            onClick={() => setShowDeleteModal(false)}
                            disabled={deleting}
                        >
                            Bekor qilish
                        </button>

                        <button
                            className={s.ConfirmDeleteBtn}
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <Loading />
                            ) : (
                                <>
                                    <i className="bi bi-trash3-fill"></i>
                                    O'chirish
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* TASHXISNI O'CHIRISH MODALI */}
            <Modal isOpen={!!visitToDelete} onClose={() => setVisitToDelete(null)}>
                <div className={s.DeleteConfirmation}>
                    <div className={s.DeleteIcon}>
                        <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <h2>Tashxisni o'chirish</h2>
                    <p>
                        Bu tashxisni o'chirmoqchimisiz?
                        <br />
                        <span className={s.WarningText}>Bu amalni qaytarib bo'lmaydi!</span>
                    </p>
                    <div className={s.DeleteButtons}>
                        <button className={s.CancelBtn} onClick={() => setVisitToDelete(null)} disabled={deletingVisit}>
                            Bekor qilish
                        </button>
                        <button className={s.ConfirmDeleteBtn} onClick={handleDeleteVisit} disabled={deletingVisit}>
                            {deletingVisit ? <Loading /> : (<><i className="bi bi-trash"></i> O'chirish</>)}
                        </button>
                    </div>
                </div>
            </Modal>

            {printTarget && createPortal(
                <PrintReceipt
                    title="Bemor qabul varaqasi"
                    patientName={`${patient.first_name} ${patient.last_name} ${patient.middle_name}`.trim()}
                    patientInfo={receiptPatientInfo}
                    credentials={DEMO_CREDENTIALS}
                    complaintId={printTarget.visit?.id}
                    complaint={printTarget.visit?.complaint}
                    notes={printTarget.visit?.notes}
                />,
                document.body
            )}
        </div>
    );
};

export default NursePatientDetail;