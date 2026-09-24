import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import s from './DoctorWaitingPatientDetail.module.scss';
import { api } from '../../../../App';
import DateTimeFormatter from '../../../../components/shared/DateTimeFormatter/DateTimeFormatter';

// ============================================================
// HELPERS
// ============================================================

const calcAge = (birthDate) => {
    if (!birthDate) return '?';

    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
};

const STATUS_LABELS = {
    WAITING: 'Kutilmoqda',
    IN_PROGRESS: 'Jarayonda',
    DONE: 'Yakunlangan',
    COMPLETED: 'Yakunlangan',
    CANCELLED: 'Bekor qilingan',
};

const DIAG_STATUS_LABELS = {
    REQUESTED: 'Yuborildi',
    ASSIGNED: 'Biriktirildi',
    IN_PROGRESS: 'Jarayonda',
    COMPLETED: 'Natija tayyor',
    NO_SHOW: 'Kelmagan',
    CANCELLED: 'Bekor qilingan',
};

const authHeaders = (token, json = false) => ({
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const getFileUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;

    try {
        const origin = new URL(api).origin;
        return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
    } catch {
        return path;
    }
};

// ============================================================
// COMPONENT
// ============================================================

const DoctorWaitingPatientDiagnosticsDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Patient
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Complaint selection
    const [selectedComplaintId, setSelectedComplaintId] = useState(null);

    // Services
    const [services, setServices] = useState([]);
    const [serviceEmployees, setServiceEmployees] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);

    // Diagnostic form
    const [selectedServices, setSelectedServices] = useState([]);
    const [diagNote, setDiagNote] = useState('');
    const [diagSaving, setDiagSaving] = useState(false);
    const [diagError, setDiagError] = useState('');
    const [diagSuccess, setDiagSuccess] = useState(false);

    // Real examination requests
    const [diagnosticRequests, setDiagnosticRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    useEffect(() => {
        fetchPatient();
        fetchDiagnosticServices();
    }, [id]);

    useEffect(() => {
        if (patient?.complaints?.length > 0) {
            fetchDiagnosticRequests();
        }
    }, [patient]);

    // ------------------------------------------------------------
    // FETCH PATIENT
    // ------------------------------------------------------------

    const fetchPatient = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('hospital_access');

            const res = await fetch(`${api}/dpatientInfo/${id}/`, {
                method: 'GET',
                headers: authHeaders(token),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            setPatient(await res.json());
        } catch (err) {
            console.error('Patient API error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------
    // FETCH SERVICES + SERVICE EMPLOYEES
    // ------------------------------------------------------------

    const fetchDiagnosticServices = async () => {
        try {
            setServicesLoading(true);

            const token = localStorage.getItem('hospital_access');

            const [servicesRes, employeesRes] = await Promise.all([
                fetch(`${api}/services/`, { method: 'GET', headers: authHeaders(token) }),
                fetch(`${api}/service-employees/`, { method: 'GET', headers: authHeaders(token) }),
            ]);

            if (!servicesRes.ok) throw new Error(`Services HTTP error: ${servicesRes.status}`);
            if (!employeesRes.ok) throw new Error(`Service employees HTTP error: ${employeesRes.status}`);

            const servicesData = await servicesRes.json();
            const employeesData = await employeesRes.json();

            const servicesList = Array.isArray(servicesData) ? servicesData : servicesData.results || [];
            const employeesList = Array.isArray(employeesData) ? employeesData : employeesData.results || [];

            setServices(servicesList.filter((service) => service.is_active));
            setServiceEmployees(employeesList.filter((item) => item.is_active));
        } catch (err) {
            console.error('Diagnostika xizmatlarini olishda xatolik:', err);
            setDiagError('Diagnostika xizmatlarini yuklashda xatolik yuz berdi');
        } finally {
            setServicesLoading(false);
        }
    };

    // ------------------------------------------------------------
    // FETCH EXAMINATION REQUESTS
    // ------------------------------------------------------------

    const fetchDiagnosticRequests = async () => {
        try {
            setRequestsLoading(true);

            const token = localStorage.getItem('hospital_access');

            const res = await fetch(`${api}/examination-requests/`, {
                method: 'GET',
                headers: authHeaders(token),
            });

            if (!res.ok) {
                throw new Error(`Examination requests HTTP error: ${res.status}`);
            }

            const data = await res.json();
            const requests = Array.isArray(data) ? data : data.results || [];

            const medicalVisitIds = (patient?.complaints || [])
                .map((complaint) => Number(complaint.id))
                .filter(Boolean);

            setDiagnosticRequests(
                requests.filter((request) => medicalVisitIds.includes(Number(request.medical_visit)))
            );
        } catch (err) {
            console.error('Examination requests olishda xatolik:', err);
            setDiagError('Diagnostika so‘rovlarini yuklashda xatolik yuz berdi');
        } finally {
            setRequestsLoading(false);
        }
    };

    // ------------------------------------------------------------
    // SELECTED COMPLAINT
    // ------------------------------------------------------------

    const selectedComplaint =
        patient?.complaints?.find((complaint) => complaint.id === selectedComplaintId) || null;

    const existingRequestsForComplaint = useMemo(() => {
        if (!selectedComplaint) return [];

        return diagnosticRequests.filter(
            (request) => Number(request.medical_visit) === Number(selectedComplaint.id)
        );
    }, [selectedComplaint, diagnosticRequests]);

    const alreadySentForComplaint = existingRequestsForComplaint.length > 0;

    const resetDiagState = () => {
        setSelectedServices([]);
        setDiagNote('');
        setDiagError('');
        setDiagSuccess(false);
    };

    const handleSelectComplaint = (complaint) => {
        if (selectedComplaintId === complaint.id) {
            setSelectedComplaintId(null);
            resetDiagState();
            return;
        }

        setSelectedComplaintId(complaint.id);
        resetDiagState();
    };

    // ------------------------------------------------------------
    // GET DOCTORS FOR SERVICE
    // ------------------------------------------------------------

    const getDoctorsForService = (serviceId) => {
        return serviceEmployees
            .filter((item) => Number(item.service) === Number(serviceId) && item.is_active)
            .reduce((unique, item) => {
                // employee_detail.id = DoctorProfile ID
                const doctorId = Number(item.employee_detail?.id);
                const userId = Number(item.employee_detail?.user_id || item.employee);

                if (!unique.some((doctor) => Number(doctor.id) === doctorId)) {
                    unique.push({
                        id: doctorId,
                        user_id: userId,
                        full_name:
                            item.employee_detail?.full_name ||
                            item.employee_detail?.username ||
                            `Xodim #${doctorId}`,
                        username: item.employee_detail?.username || '',
                    });
                }

                return unique;
            }, []);
    };

    // ------------------------------------------------------------
    // TOGGLE SERVICE
    // ------------------------------------------------------------

    const toggleService = (serviceId) => {
        setSelectedServices((prev) =>
            prev.includes(serviceId) ? prev.filter((sid) => sid !== serviceId) : [...prev, serviceId]
        );
    };

    // ------------------------------------------------------------
    // SUBMIT DIAGNOSTICS
    // ------------------------------------------------------------

    const handleSubmitDiagnostics = async (e) => {
        e.preventDefault();

        setDiagError('');
        setDiagSuccess(false);

        if (!selectedComplaint) {
            setDiagError('Avval shikoyatni tanlang');
            return;
        }

        if (alreadySentForComplaint) {
            setDiagError('Bu shikoyat uchun diagnostika allaqachon yuborilgan');
            return;
        }

        if (selectedServices.length === 0) {
            setDiagError('Kamida 1 ta diagnostika xizmatini tanlang');
            return;
        }

        const medicalVisitId = selectedComplaint.id;

        if (!medicalVisitId) {
            setDiagError('Shikoyatga medical_visit ID biriktirilmagan');
            return;
        }

        for (const serviceId of selectedServices) {
            if (getDoctorsForService(serviceId).length === 0) {
                const service = services.find((item) => Number(item.id) === Number(serviceId));
                setDiagError(`"${service?.name || 'Xizmat'}" xizmatiga shifokor biriktirilmagan`);
                return;
            }
        }

        setDiagSaving(true);

        try {
            const token = localStorage.getItem('hospital_access');

            // Har bir service uchun alohida ExaminationRequest
            for (const serviceId of selectedServices) {
                const doctor = getDoctorsForService(serviceId)[0];

                // assigned_to = DoctorProfile ID (user_id emas)
                const payload = {
                    medical_visit: Number(medicalVisitId),
                    service: Number(serviceId),
                    assigned_to: Number(doctor.id),
                    doctor_note: diagNote || '',
                    priority: 1,
                };

                const response = await fetch(`${api}/examination-requests/`, {
                    method: 'POST',
                    headers: authHeaders(token, true),
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Backend error:', errorData);
                    throw new Error(JSON.stringify(errorData));
                }
            }

            setDiagSuccess(true);
            await fetchDiagnosticRequests();
        } catch (err) {
            console.error('Diagnostikaga yuborishda xatolik:', err);
            setDiagError(err.message || 'Diagnostikaga yuborishda xatolik yuz berdi');
        } finally {
            setDiagSaving(false);
        }
    };

    // ------------------------------------------------------------
    // DELETE REQUEST
    // ------------------------------------------------------------

    const removeDiagRequest = async (requestId) => {
        try {
            const token = localStorage.getItem('hospital_access');

            const res = await fetch(`${api}/examination-requests/${requestId}/`, {
                method: 'DELETE',
                headers: authHeaders(token),
            });

            if (!res.ok) {
                throw new Error(`Delete error: ${res.status}`);
            }

            setDiagnosticRequests((prev) => prev.filter((request) => request.id !== requestId));
        } catch (err) {
            console.error('Request o‘chirishda xatolik:', err);
            setDiagError('Diagnostika so‘rovini o‘chirib bo‘lmadi');
        }
    };

    // ------------------------------------------------------------
    // BITTA DIAGNOSTIKA SO'ROVI KARTASI
    // ------------------------------------------------------------

    const renderRequestCard = (request) => {
        const fileUrl = getFileUrl(request.result?.result_file);

        return (
            <div key={request.id} className={s.DiagRequestCard}>
                <div className={s.DiagRequestTop}>
                    <div className={s.DiagTypesBadges} style={{ marginTop: 0 }}>
                        <span className={s.DiagTypeBadge}>
                            {request.service_detail?.name || 'Nomaʼlum xizmat'}
                        </span>
                    </div>

                    {request.status !== 'COMPLETED' && (
                        <button
                            type="button"
                            className={s.RemoveItemBtn}
                            onClick={() => removeDiagRequest(request.id)}
                        >
                            <i className="bi bi-x"></i>
                        </button>
                    )}
                </div>

                <div className={s.DiagRequestMeta}>
                    <span>
                        <i className="bi bi-person-badge"></i>
                        {request.assigned_to_detail?.full_name ||
                            request.assigned_to_detail?.username ||
                            'Hali biriktirilmagan'}
                    </span>

                    <span>
                        <i className="bi bi-calendar3"></i>
                        {request.requested_at ? (
                            <DateTimeFormatter date={request.requested_at} format="datetime" />
                        ) : (
                            '-'
                        )}
                    </span>
                </div>

                {request.doctor_note && <p className={s.DiagRequestNote}>{request.doctor_note}</p>}

                <div className={s.DiagStatusRow}>
                    <label>Holati</label>
                    <span className={`${s.DiagStatusBadge} ${s[request.status?.toLowerCase()] || ''}`}>
                        {DIAG_STATUS_LABELS[request.status] || request.status}
                    </span>
                </div>

                {request.result && (
                    <div
                        className={s.DiagRequestMeta}
                        style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px dashed #e5e7eb',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 8,
                        }}
                    >
                        {request.result.result_text && (
                            <p
                                className={s.DiagRequestNote}
                                style={{ borderTop: 'none', paddingTop: 0, margin: 0 }}
                            >
                                <i className="bi bi-file-text"></i> {request.result.result_text}
                            </p>
                        )}

                        {fileUrl && (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className={s.FieldHint}>
                                <i className="bi bi-paperclip"></i> Natija faylini ko'rish
                            </a>
                        )}

                        <span>
                            <i className="bi bi-person-check"></i>
                            Kim bajardi:{' '}
                            {request.result.completed_by_detail?.full_name ||
                                request.result.completed_by_detail?.username ||
                                '-'}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // ------------------------------------------------------------
    // DIAGNOSTIKAGA YUBORISH FORMASI (shikoyat ichida ochiladi)
    // ------------------------------------------------------------

    const renderDiagnosticForm = () => (
        <form className={s.ComplaintForm} onSubmit={handleSubmitDiagnostics}>
            <div className={s.PlanFormHead}>
                <h2>Diagnostikaga yuborish</h2>

                <button
                    type="button"
                    className={s.CancelSelectBtn}
                    onClick={() => {
                        setSelectedComplaintId(null);
                        resetDiagState();
                    }}
                >
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            <div className={s.Field}>
                <label>Diagnostika xizmatlari *</label>

                {servicesLoading ? (
                    <div className={s.LoadingText}>
                        <i className="bi bi-arrow-repeat"></i>
                        Xizmatlar yuklanmoqda...
                    </div>
                ) : services.length === 0 ? (
                    <div className={s.EmptyServices}>
                        <i className="bi bi-info-circle"></i>
                        <span>Hozircha faol diagnostika xizmati mavjud emas</span>
                    </div>
                ) : (
                    <div className={s.DiagnosticServices}>
                        {services.map((service) => {
                            const selected = selectedServices.includes(Number(service.id));
                            const serviceDoctors = getDoctorsForService(service.id);

                            return (
                                <div
                                    key={service.id}
                                    className={`${s.DiagnosticServiceRow} ${
                                        selected ? s.DiagnosticServiceRowActive : ''
                                    }`}
                                >
                                    <button
                                        type="button"
                                        className={s.DiagnosticServiceSelect}
                                        onClick={() => toggleService(Number(service.id))}
                                        disabled={diagSaving}
                                    >
                                        <span className={s.ServiceCheck}>
                                            {selected ? <i className="bi bi-check"></i> : null}
                                        </span>

                                        <span className={s.ServiceInfo}>
                                            <strong>{service.name}</strong>
                                            {service.description && <small>{service.description}</small>}
                                        </span>

                                        <span className={s.ServicePrice}>
                                            {Number(service.price).toLocaleString('uz-UZ')} so'm
                                        </span>

                                        <span className={s.ServiceDuration}>
                                            <i className="bi bi-clock"></i>
                                            {service.duration_minutes} daqiqa
                                        </span>

                                        <div className={s.ServiceDoctor}>
                                            <span className={s.DoctorLabel}>
                                                <i className="bi bi-person-badge"></i>
                                                Shifokor
                                            </span>

                                            {serviceDoctors.length > 0 ? (
                                                <div className={s.AssignedDoctor}>
                                                    <span>{serviceDoctors[0].full_name}</span>
                                                </div>
                                            ) : (
                                                <div className={s.NoAssignedDoctor}>
                                                    <span>Shifokor biriktirilmagan</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <span className={s.FieldHint}>Bemor uchun kerakli diagnostika xizmatlarini tanlang</span>
            </div>

            <div className={s.Field}>
                <label>Izoh (ixtiyoriy)</label>
                <textarea
                    rows={2}
                    placeholder="Masalan: natija shoshilinch kerak"
                    value={diagNote}
                    onChange={(e) => setDiagNote(e.target.value)}
                    disabled={diagSaving}
                />
            </div>

            {diagError && (
                <p className={s.FormError}>
                    <i className="bi bi-exclamation-circle-fill"></i>
                    {diagError}
                </p>
            )}

            {diagSuccess && (
                <p className={s.FormSuccess}>
                    <i className="bi bi-check-circle-fill"></i>
                    Bemor diagnostikaga yuborildi.
                </p>
            )}

            <button type="submit" className={s.SubmitPlanBtn} disabled={diagSaving || servicesLoading}>
                {diagSaving ? 'Yuborilmoqda...' : 'Diagnostikaga yuborish'}
            </button>
        </form>
    );

    // ------------------------------------------------------------
    // RENDER STATES
    // ------------------------------------------------------------

    if (loading) {
        return (
            <div className={s.State}>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={s.State}>
                <p>Xatolik: {error}</p>
            </div>
        );
    }

    if (!patient) return null;

    // ------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------

    return (
        <div className={s.DetailPage}>
            {/* BACK */}
            <button className={s.BackBtn} onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left"></i>
                Bemorlar ro'yxatiga qaytish
            </button>

            {/* PATIENT BANNER */}
            <div className={s.Banner}>
                <div className={s.BannerLeft}>
                    <div className={s.Avatar}>{patient.first_name?.charAt(0) || '?'}</div>

                    <div>
                        <h1>
                            {patient.first_name} {patient.last_name} {patient.middle_name}
                        </h1>

                        <p>
                            {calcAge(patient.date_of_birth)} yosh
                            {' · '}
                            {patient.gender === 'erkak' ? 'Erkak' : 'Ayol'}
                        </p>
                    </div>
                </div>

                <span className={s.StatusPill}>
                    {patient.status || 'Faol'}
                    <i className="bi bi-chevron-down"></i>
                </span>
            </div>

            {/* PATIENT INFO */}
            <div className={s.InfoRow}>
                <div className={s.InfoCard}>
                    <i className="bi bi-telephone"></i>
                    <div>
                        <span>Telefon</span>
                        <p>{patient.contact_number}</p>
                    </div>
                </div>

                <div className={s.InfoCard}>
                    <i className="bi bi-geo-alt"></i>
                    <div>
                        <span>Manzil</span>
                        <p>{patient.address}</p>
                    </div>
                </div>

                <div className={s.InfoCard}>
                    <i className="bi bi-calendar3"></i>
                    <div>
                        <span>Tug'ilgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient.date_of_birth} format="date" />
                    </div>
                </div>

                <div className={s.InfoCard}>
                    <i className="bi bi-clock-history"></i>
                    <div>
                        <span>Ro'yxatdan o'tgan sana</span>
                        <DateTimeFormatter className={s.datt} date={patient.create_date} />
                    </div>
                </div>
            </div>

            {/* COMPLAINTS */}
            {patient.complaints?.length > 0 && (
                <div className={s.ComplaintsSection}>
                    <h2>Shikoyatlar</h2>
                    <p className={s.ComplaintsHint}>Diagnostikaga yuborish uchun shikoyatni tanlang</p>

                    <div className={s.ComplaintsList}>
                        {patient.complaints
                            .filter((complaint) => complaint.status === 'WAITING')
                            .map((complaint) => {
                                const complaintRequests = diagnosticRequests.filter(
                                    (request) => Number(request.medical_visit) === Number(complaint.id)
                                );
                                const hasDiagnostics = complaintRequests.length > 0;
                                const isSelected = selectedComplaintId === complaint.id;

                                return (
                                    <div
                                        key={complaint.id}
                                        className={`${s.ComplaintGroup} ${
                                            isSelected ? s.ComplaintGroupSelected : ''
                                        }`}
                                    >
                                        {/* SHIKOYAT */}
                                        <button
                                            type="button"
                                            className={s.ComplaintCard}
                                            onClick={() => handleSelectComplaint(complaint)}
                                        >
                                            <div className={s.ComplaintTop}>
                                                <span
                                                    className={`${s.StatusTag} ${
                                                        s[complaint.status?.toLowerCase()]
                                                    }`}
                                                >
                                                    {STATUS_LABELS[complaint.status] || complaint.status}
                                                </span>

                                                <DateTimeFormatter
                                                    date={complaint.created_at}
                                                    format="datetime"
                                                    className={s.ComplaintDate}
                                                />
                                            </div>

                                            <p>{complaint.complaint}</p>

                                            <div className={s.ComplaintBadges}>
                                                {hasDiagnostics && (
                                                    <span className={s.DiagSentTag}>
                                                        <i className="bi bi-check-circle-fill"></i>
                                                        Diagnostikaga yuborilgan ({complaintRequests.length})
                                                    </span>
                                                )}

                                                {isSelected && (
                                                    <span className={s.SelectedTag}>
                                                        <i className="bi bi-check-circle-fill"></i>
                                                        Tanlandi
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                        {/* SHU SHIKOYATNING DIAGNOSTIKALARI */}
                                        {requestsLoading && !hasDiagnostics ? (
                                            <div className={s.LoadingText}>
                                                <i className="bi bi-arrow-repeat"></i>
                                                Diagnostikalar yuklanmoqda...
                                            </div>
                                        ) : (
                                            hasDiagnostics && (
                                                <div className={s.ComplaintDiagWrap}>
                                                    <h3 className={s.ComplaintDiagTitle}>
                                                        <i className="bi bi-clipboard2-pulse"></i>
                                                        Diagnostikalar
                                                    </h3>

                                                    <div className={s.ComplaintDiagList}>
                                                        {complaintRequests.map(renderRequestCard)}
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* FORMA — tanlangan shikoyat ichida, hali yuborilmagan bo'lsa */}
                                        {isSelected && !hasDiagnostics && renderDiagnosticForm()}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorWaitingPatientDiagnosticsDetail;