import React, { useState, useEffect } from 'react';
import s from './PatientEdit.module.scss';
import Loading from '../../Loading/Loading';
import { api } from '../../../App';
import { useNavigate, useParams } from 'react-router-dom';

const PatientEdit = ({ onSuccess, patientId: propPatientId, visitId: propVisitId }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const patientId = propPatientId || id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState(false);
    const [fetchError, setFetchError] = useState('');

    // Bemor ma'lumotlari
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
        gender: '',
        contact_number: '',
        address: '',
        status: 'Faol',
    });
    const [errors, setErrors] = useState({});
    const [originalData, setOriginalData] = useState(null);

    const [visitErrors, setVisitErrors] = useState({});
    const [originalVisitData, setOriginalVisitData] = useState(null);

    // Ikkalasini bir vaqtda yuklaymiz
    useEffect(() => {
        const fetchAll = async () => {
            if (!patientId) {
                setFetchError('Bemor ID si topilmadi');
                setLoading(false);
                return;
            }

            setLoading(true);
            setFetchError('');

            try {
                const token = localStorage.getItem('hospital_access');

                const requests = [
                    fetch(`${api}/patientUpdate/${patientId}/`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                ];
                const responses = await Promise.all(requests);

                if (!responses[0].ok) {
                    if (responses[0].status === 404) throw new Error('Bemor topilmadi');
                    throw new Error(`HTTP error! status: ${responses[0].status}`);
                }

                const patientJson = await responses[0].json();
                const patientData = {
                    first_name: patientJson.first_name || '',
                    last_name: patientJson.last_name || '',
                    middle_name: patientJson.middle_name || '',
                    date_of_birth: patientJson.date_of_birth || patientJson.birth_date || '',
                    gender: patientJson.gender || '',
                    contact_number: patientJson.contact_number || patientJson.phone || '',
                    address: patientJson.address || '',
                    status: patientJson.status || 'Faol',
                };
                setFormData(patientData);
                setOriginalData(patientData);

                if (propVisitId && responses[1]) {
                    if (!responses[1].ok) {
                        if (responses[1].status === 404) throw new Error('Tashxis topilmadi');
                        throw new Error(`HTTP error! status: ${responses[1].status}`);
                    }
                    const visitJson = await responses[1].json();
                    const visitInfo = {
                        doctors: visitJson.doctors || '',
                        complaint: visitJson.complaint || '',
                        status: visitJson.status || 'WAITING',
                        notes: visitJson.notes || '',
                    };
                    setVisitData(visitInfo);
                    setOriginalVisitData(visitInfo);
                }

                setLoading(false);
            } catch (err) {
                console.error('Ma\'lumotlarni yuklashda xatolik:', err);
                setFetchError(err.message || "Ma'lumotlarni yuklashda xatolik yuz berdi");
                setLoading(false);
            }
        };

        fetchAll();
    }, [patientId, propVisitId]);

    // ---------- Bemor form handlerlari ----------

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (serverError) setServerError('');
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.first_name.trim()) newErrors.first_name = "Ism kiritilishi shart";
        if (!formData.last_name.trim()) newErrors.last_name = "Familiya kiritilishi shart";
        if (!formData.date_of_birth) newErrors.date_of_birth = "Tug'ilgan sana kiritilishi shart";
        if (!formData.gender) newErrors.gender = "Jinsi tanlanishi shart";
        if (!formData.contact_number.trim()) {
            newErrors.contact_number = "Telefon raqami kiritilishi shart";
        } else if (!/^\+?\d{9,13}$/.test(formData.contact_number.replace(/\s/g, ''))) {
            newErrors.contact_number = "Telefon raqami noto'g'ri formatda";
        }
        if (!formData.address.trim()) newErrors.address = "Manzil kiritilishi shart";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    // ---------- O'zgarishlarni tekshirish ----------

    const patientChanged = () => {
        if (!originalData) return false;
        return JSON.stringify(formData) !== JSON.stringify(originalData);
    };

    const hasAnyChanges = () => patientChanged();

    // ---------- Bitta umumiy submit — ikkalasini bir vaqtda yuboradi ----------

    const handleSubmit = async (e) => {
    e.preventDefault();

    setServerError('');
    setSuccess(false);

    if (!validate()) return;

    if (!patientChanged()) {
        setServerError("Hech qanday o'zgarish kiritilmagan");
        return;
    }

    setSaving(true);

    try {
        const token = localStorage.getItem('hospital_access');

        const patientBody = new FormData();

        Object.entries(formData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                patientBody.append(key, value);
            }
        });

        const res = await fetch(`${api}/patientUpdate/${patientId}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: patientBody,
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data?.detail ||
                data?.message ||
                "Yangilashda xatolik yuz berdi"
            );
        }

        setOriginalData(formData);
        setSuccess(true);

        setTimeout(() => {
            if (onSuccess) {
                onSuccess();
            } else {
                navigate('/nurse-patients');
            }
        }, 1500);

    } catch (err) {
        setServerError(err.message);
    } finally {
        setSaving(false);
    }
};

    // ---------- RENDER ----------

    if (loading) {
        return (
            <div className={s.EditSection}>
                <div className={s.LoadingWrapper}>
                    <Loading />
                    <p>Ma'lumotlar yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className={s.EditSection}>
                <div className={s.ErrorWrapper}>
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <p>{fetchError}</p>
                    <button onClick={() => navigate('/nurse-patients')}>
                        Bemorlar ro'yxatiga qaytish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <section className={s.EditSection}>

            <div className={s.EditHeader}>
                <h1>
                    <i className="bi bi-pencil-square"></i>
                    Bemorni tahrirlash
                </h1>
                <p className={s.PatientName}>{formData.first_name} {formData.last_name}</p>
            </div>

            {success && (
                <div className={s.SuccessAlert}>
                    <i className="bi bi-check-circle-fill"></i>
                    Ma'lumotlar muvaffaqiyatli yangilandi!
                </div>
            )}

            <form className={s.EditForm} onSubmit={handleSubmit} noValidate>

                {/* BEMOR MA'LUMOTLARI */}
                <div className={s.SectionBlock}>
                    <h3><i className="bi bi-person"></i> Bemor ma'lumotlari</h3>

                    <div className={s.Row}>
                        <div className={s.Input}>
                            <p>Ism *</p>
                            <input type="text" name="first_name" placeholder="Ism"
                                value={formData.first_name} onChange={handleChange} disabled={saving} />
                            {errors.first_name && <span className={s.ErrorText}>{errors.first_name}</span>}
                        </div>

                        <div className={s.Input}>
                            <p>Familiya *</p>
                            <input type="text" name="last_name" placeholder="Familiya"
                                value={formData.last_name} onChange={handleChange} disabled={saving} />
                            {errors.last_name && <span className={s.ErrorText}>{errors.last_name}</span>}
                        </div>

                        <div className={s.Input}>
                            <p>Sharif</p>
                            <input type="text" name="middle_name" placeholder="Sharif"
                                value={formData.middle_name} onChange={handleChange} disabled={saving} />
                        </div>
                    </div>

                    <div className={s.Row}>
                        <div className={s.Input}>
                            <p>Tug'ilgan sana *</p>
                            <input type="date" name="date_of_birth"
                                value={formData.date_of_birth} onChange={handleChange} disabled={saving} />
                            {errors.date_of_birth && <span className={s.ErrorText}>{errors.date_of_birth}</span>}
                        </div>

                        <div className={s.Input}>
                            <p>Jinsi *</p>
                            <select name="gender" value={formData.gender} onChange={handleChange} disabled={saving}>
                                <option value="">Tanlang</option>
                                <option value="erkak">Erkak</option>
                                <option value="ayol">Ayol</option>
                            </select>
                            {errors.gender && <span className={s.ErrorText}>{errors.gender}</span>}
                        </div>

                        <div className={s.Input}>
                            <p>Telefon *</p>
                            <input type="text" name="contact_number" placeholder="+998 XX XXX XX XX"
                                value={formData.contact_number} onChange={handleChange} disabled={saving} />
                            {errors.contact_number && <span className={s.ErrorText}>{errors.contact_number}</span>}
                        </div>
                    </div>

                    <div className={s.Input}>
                        <p>Manzil *</p>
                        <input type="text" name="address" placeholder="Yashash manzili"
                            value={formData.address} onChange={handleChange} disabled={saving} />
                        {errors.address && <span className={s.ErrorText}>{errors.address}</span>}
                    </div>
                </div>

                {serverError && (
                    <p className={s.ServerError}>
                        <i className="bi bi-exclamation-circle-fill"></i> {serverError}
                    </p>
                )}

                <div className={s.ButtonRow}>
                    {/* <button type="button" className={s.CancelBtn}
                        onClick={() => navigate('/nurse-patients')} disabled={saving}>
                        Bekor qilish
                    </button> */}
                    <button type="submit" className={s.SubmitBtn} disabled={saving || !hasAnyChanges()}>
                        {saving ? <Loading /> : (<><i className="bi bi-save"></i> Saqlash</>)}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default PatientEdit;