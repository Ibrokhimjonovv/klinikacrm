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
import ImageZoomViewer from '../../../components/shared/ImageZoomViewer/ImageZoomViewer';

const calcAge = (birthDate) => {
    if (!birthDate) return 'Noma\'lum';
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const formatSum = (n) =>
    Math.round(Number(n) || 0).toLocaleString('uz-UZ') + " so'm";

const isImageUrl = (url) => {
    if (!url) return false;
    if (String(url).startsWith('data:image')) return true;
    const clean = String(url).split('?')[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(clean);
};

// Nisbiy yo'lni (/media/...) to'liq URL'ga aylantiradi
const fileUrl = (path) => {
    if (!path) return '';
    if (/^(https?:|data:)/.test(path)) return path;
    try {
        return new URL(path, api).href; // api = https://host/api bo'lsa ham origin olinadi
    } catch {
        return path;
    }
};

const fileNameFromUrl = (url) => {
    try {
        return decodeURIComponent(String(url).split('?')[0].split('/').pop());
    } catch {
        return 'Fayl';
    }
};

const EXAM_STATUS = {
    COMPLETED: 'Yakunlandi',
    IN_PROGRESS: 'Jarayonda',
    PENDING: 'Kutilmoqda',
};

const NursePatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { removePatientLocally } = useAppContext();

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [examinations, setExaminations] = useState([]);

    const [visits, setVisits] = useState([]);
    const [visitsLoading, setVisitsLoading] = useState(true);
    const [visitsError, setVisitsError] = useState('');

    const [showEditModal, setShowEditModal] = useState(false);
    const [showEditVisitModal, setShowEditVisitModal] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);

    const [showAddVisitModal, setShowAddVisitModal] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [visitToDelete, setVisitToDelete] = useState(null);
    const [deletingVisit, setDeletingVisit] = useState(false);

    const [printTarget, setPrintTarget] = useState(null);

    // Diagnostika fayli modali
    const [selectedDiag, setSelectedDiag] = useState(null);
    const [zoomImage, setZoomImage] = useState(null);

    const DEMO_CREDENTIALS = { username: 'xxxxxxxx', password: 'xxxxxxxx' };

    const latestVisit = visits.length
        ? visits.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a))
        : null;

    // Faqat WAITING holatdagi shikoyatlar ko'rinadi
    const waitingVisits = visits.filter((v) => v.status === 'WAITING');

    // Diagnostikalar: /patientInfo/:id/ javobidagi examinations massividan olinadi
    const diagnostics = examinations.map((ex) => ({
        id: ex.id,
        name: ex.service_name,
        status: ex.status,
        completed_at: ex.completed_at,
        file: fileUrl(ex.result?.result_file),
        resultText: ex.result?.result_text,
        diagnosis: ex.result?.diagnosis,
        doctor: ex.result?.completed_by?.full_name || ex.assigned_to?.full_name,
    }));

    const handlePrint = async (visit = null) => {
        await logoReady;
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
                create_date: data.create_date || '',
            };

            setPatient(formattedPatient);
            setExaminations(Array.isArray(data.examinations) ? data.examinations : []);
            setLoading(false);
        } catch (err) {
            console.error('Bemorni yuklashda xatolik:', err);
            setError(err.message || "Bemor ma'lumotlarini yuklashda xatolik yuz berdi");
            setLoading(false);
        }
    };

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

    const openVisitDetail = (visitId) => {
        navigate(`/nurse/patients/${id}/visits/${visitId}`);
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
                    <Link to="/nurse/patients/patients" className={s.NotActive}>Bemorlar ro'yxati</Link> / <span>{patient.first_name} {patient.last_name}</span>
                </div>

                <div className={s.ActionButtons}>
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

                <div className={s.StatusPill}>
                    <span className={s.StatusDot}></span>
                    Bemor
                </div>
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

            {/* SHIKOYATLAR — faqat WAITING */}
            <div className={s.VisitsCard}>
                <div className={s.VisitsHead}>
                    <h3><i className="bi bi-file-medical"></i> Shikoyatlar daftarchasi <span>{waitingVisits.length} ta</span></h3>
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
                ) : waitingVisits.length === 0 ? (
                    <p className={s.Empty}>Kutilayotgan shikoyat yo'q</p>
                ) : (
                    <ul className={s.VisitsList}>
                        {waitingVisits.map((v, i) => (
                            <li key={v.id || i} onClick={() => openVisitDetail(v.id)} className={s.VisitClickable}>
                                <div className={s.VisitLeft}>
                                    <div className={s.VisitInfo}>
                                        <p className="truncate">{v.complaint}</p>
                                        <span className={s.VisitMeta}>
                                            {v.doctorNames && <>Shifokor: {v.doctorNames}</>}
                                        </span>

                                        {/* Narx va to'lov holati */}
                                        <div className={s.VisitPayRow}>
                                            <span className={s.VisitPrice}>
                                                <i className="bi bi-receipt"></i> {formatSum(v.price)}
                                            </span>
                                            {v.is_paid ? (
                                                <span className={s.PaidTag}>
                                                    <i className="bi bi-check-circle-fill"></i> To'langan
                                                    {v.paid_at && (
                                                        <>
                                                            {' · '}
                                                            <DateTimeFormatter format="datetime" date={v.paid_at} />
                                                        </>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className={s.UnpaidTag}>
                                                    <i className="bi bi-lock-fill"></i> To'lanmagan
                                                </span>
                                            )}
                                        </div>
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
                                            e.stopPropagation();
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

            {/* DIAGNOSTIKALAR — shikoyatlar daftarchasi tagida alohida karta */}
            {diagnostics.length > 0 && (
                <div className={s.DiagCard}>
                    <div className={s.VisitsHead}>
                        <h3>
                            <i className="bi bi-clipboard2-pulse"></i> Diagnostikalar <span>{diagnostics.length} ta</span>
                        </h3>
                    </div>

                    <ul className={s.DiagList}>
                        {diagnostics.map((diag, i) => (
                            <li key={diag.id || i} className={s.DiagBox}>
                                <div className={s.DiagTop}>
                                    <span className={s.DiagName}>
                                        <i className="bi bi-clipboard2-pulse"></i> {diag.name}
                                    </span>
                                    <span className={s.DiagStatus}>
                                        <i className="bi bi-check-circle-fill"></i> {EXAM_STATUS[diag.status] || diag.status}
                                    </span>
                                </div>

                                <div className={s.DiagBottom}>
                                    {diag.completed_at && (
                                        <span className={s.DiagDate}>
                                            <i className="bi bi-calendar-check"></i>
                                            <DateTimeFormatter format="datetime" date={diag.completed_at} />
                                        </span>
                                    )}
                                    {diag.doctor && (
                                        <span className={s.DiagDate}>
                                            <i className="bi bi-person"></i> {diag.doctor}
                                        </span>
                                    )}
                                    {diag.file && (
                                        <button
                                            type="button"
                                            className={s.DiagFile}
                                            onClick={() => setSelectedDiag(diag)}
                                        >
                                            <i className="bi bi-file-earmark-text"></i> Diagnostika fayli
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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
                    onSuccess={handleAddVisitSuccess}
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

            {/* DIAGNOSTIKA FAYLI MODALI (o'ngdan) */}
            <Modal isOpen={!!selectedDiag} onClose={() => setSelectedDiag(null)} side="right">
                {selectedDiag && (
                    <div className={s.DiagModal}>
                        <h2 className={s.DiagModalTitle}>
                            <i className="bi bi-clipboard2-pulse"></i> {selectedDiag.name}
                        </h2>

                        {selectedDiag.diagnosis && <p><b>Tashxis:</b> {selectedDiag.diagnosis}</p>}
                        {selectedDiag.resultText && <p>{selectedDiag.resultText}</p>}

                        {selectedDiag.file ? (
                            isImageUrl(selectedDiag.file) ? (
                                <button
                                    type="button"
                                    className={s.DiagPreview}
                                    onClick={() => setZoomImage(selectedDiag.file)}
                                >
                                    <img src={selectedDiag.file} alt={selectedDiag.name} />
                                    <span className={s.DiagPreviewHint}>
                                        <i className="bi bi-zoom-in"></i> Kattalashtirish
                                    </span>
                                </button>
                            ) : (
                                <a
                                    className={s.DiagFile}
                                    href={selectedDiag.file}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                >
                                    <i className="bi bi-file-earmark-word"></i> {fileNameFromUrl(selectedDiag.file)}
                                </a>
                            )
                        ) : (
                            <div className={s.DiagModalEmpty}>
                                <i className="bi bi-inbox"></i>
                                <p>Fayl biriktirilmagan</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* RASMNI KATTALASHTIRISH MODALI */}
            <Modal isOpen={!!zoomImage} onClose={() => setZoomImage(null)} fullWidth>
                {zoomImage && (
                    <ImageZoomViewer src={zoomImage} alt="Diagnostika natijasi" />
                )}
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