import React, { useState } from 'react';
import s from './AddVisit.module.scss';
import { api } from '../../../App';
import VisitForm from '../../shared/VisitForm/VisitForm';
import PrintReceipt from '../../shared/PrintReceipt/PrintReceipt';
import { createPortal } from 'react-dom';

const AddVisit = ({ patientId, patientName, patientInfo = [], onSuccess }) => {
    const [formData, setFormData] = useState({
        doctors: [],
        complaint: '',
        status: 'WAITING',
        notes: '',
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');

    const [finished, setFinished] = useState(false);
    const [createdComplaintId, setCreatedComplaintId] = useState(null);

    const validate = () => {
        const newErrors = {};
        if (formData.doctors.length === 0) newErrors.doctors = "Kamida bitta shifokor tanlanishi shart";
        if (!formData.complaint.trim()) newErrors.complaint = "Shikoyat kiritilishi shart";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validate()) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('hospital_access');

            const res = await fetch(`${api}/medicalVisit/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patient: patientId,
                    doctors: formData.doctors,
                    complaint: formData.complaint,
                    status: formData.status,
                    notes: formData.notes,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setServerError(data?.message || data?.detail || 'Saqlashda xatolik yuz berdi');
                return;
            }

            // MUHIM: backend qaytargan shikoyat ID'sini saqlaymiz (chop etish uchun kerak)
            setCreatedComplaintId(data?.id || data?.complaint?.id || data?.data?.id || null);
            setFinished(true);

        } catch (err) {
            setServerError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
        } finally {
            setSaving(false);
        }
    };

    const DEMO_CREDENTIALS = { username: 'xxxxxxxx', password: 'xxxxxxxx' };

    const handlePrint = () => {
        window.print();
    };

    if (finished) {
        return (
            <section className={s.AddVisitSection}>
                <div className={s.CredentialsStep}>
                    <div className={s.SuccessIcon}><i className="bi bi-check-circle-fill"></i></div>
                    <h2>Shikoyat qo'shildi!</h2>
                    <p className={s.CredentialsSub}>
                        Bemorning yangi shikoyati muvaffaqiyatli saqlandi
                    </p>

                    {createdComplaintId && (
                        <div className={s.PrintPreviewBox}>
                            <p><strong>Shikoyat ID:</strong> #{createdComplaintId}</p>
                            <p><strong>Shikoyat:</strong> {formData.complaint}</p>
                        </div>
                    )}

                    <div className={s.FinishButtons}>
                        <button type="button" className={s.PrintBtn} onClick={handlePrint}>
                            <i className="bi bi-printer"></i> Chek chop etish
                        </button>
                        <button type="button" className={s.SubmitBtn} onClick={() => { if (onSuccess) onSuccess(); }}>
                            Yopish
                        </button>
                    </div>
                </div>

                {/* CHOP ETISH UCHUN ALOHIDA SHABLON — ekranda ko'rinmaydi, faqat print paytida chiqadi */}
                {createPortal(
                    <div className="print-root">
                        <PrintReceipt
                            title="Yangi shikoyat varaqasi"
                            patientName={patientName}
                            patientInfo={patientInfo.filter((row) => row.value)}
                            credentials={DEMO_CREDENTIALS}
                            complaintId={createdComplaintId}
                            complaint={formData.complaint}
                            notes={formData.notes}
                        />
                    </div>,
                    document.body
                )}
            </section>
        );
    }

    return (
        <section className={s.AddVisitSection}>
            <VisitForm
                title={<><i className="bi bi-file-earmark-plus"></i> Yangi shikoyat qo'shish</>}
                value={formData}
                onChange={setFormData}
                errors={errors}
                onSubmit={handleSubmit}
                loading={saving}
                serverError={serverError}
                submitLabel="Saqlash"
            />
        </section>
    );
};

export default AddVisit;