import React, { useState } from 'react';
import s from './AddVisit.module.scss';
import { api } from '../../../App';
import VisitForm from '../../shared/VisitForm/VisitForm';

const AddVisit = ({ patientId, onSuccess }) => {
    const [formData, setFormData] = useState({
        doctors: [],
        complaint: '',
        status: 'WAITING',
        notes: '',
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');

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
            // const body = new FormData();
            // body.append('patient', patientId);
            // body.append('doctors', JSON.stringify(formData.doctors));
            // body.append('complaint', formData.complaint);
            // body.append('status', formData.status);
            // body.append('notes', formData.notes);

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

            if (onSuccess) onSuccess();

        } catch (err) {
            setServerError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
        } finally {
            setSaving(false);
        }
    };

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