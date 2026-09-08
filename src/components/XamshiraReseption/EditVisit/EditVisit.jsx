import React, { useState } from 'react';
import s from './EditVisit.module.scss';
import VisitForm from '../../shared/VisitForm/VisitForm';
import { api } from '../../../App';

const EditVisit = ({ visit, onSuccess }) => {
    // MUHIM: visit.doctors to'liq obyektlar massivi — faqat ID'larini olamiz
    const initialDoctorIds = (visit.doctors || []).map(d => d.id);

    const [formData, setFormData] = useState({
        doctors: initialDoctorIds,
        id: visit.id || '',
        complaint: visit.complaint || '',
        status: visit.status || 'WAITING',
        notes: visit.notes || '',
        patient: visit.patient
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState(false);

    const originalData = {
        doctors: initialDoctorIds,
        complaint: visit.complaint || '',
        status: visit.status || 'WAITING',
        notes: visit.notes || '',
    };

    const hasChanges = () => JSON.stringify(formData) !== JSON.stringify(originalData);

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
        setSuccess(false);
        if (!validate()) return;

        if (!hasChanges()) {
            setServerError("Hech qanday o'zgarish kiritilmagan");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('hospital_access');
            const body = new FormData();
            formData.doctors.forEach(id => body.append('doctors', id));
            body.append('complaint', formData.complaint);
            body.append('status', formData.status);
            body.append('notes', formData.notes);
            body.append('patient', formData.patient.id);
            
            const res = await fetch(`${api}/medicalUpdate/${visit.id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body,
            });

            const data = await res.json();

            if (!res.ok) {
                setServerError(data?.message || data?.detail || 'Yangilashda xatolik yuz berdi');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 1000);

        } catch (err) {
            setServerError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={s.EditVisitSection}>
            {success && (
                <div className={s.SuccessAlert}>
                    <i className="bi bi-check-circle-fill"></i> Tashxis muvaffaqiyatli yangilandi!
                </div>
            )}

            <VisitForm
                title={<><i className="bi bi-pencil-square"></i> Tashxisni tahrirlash</>}
                value={formData}
                onChange={setFormData}
                errors={errors}
                onSubmit={handleSubmit}
                loading={saving}
                serverError={serverError}
                submitLabel="Saqlash"
                submitIcon="bi-save"
            />
        </section>
    );
};

export default EditVisit;