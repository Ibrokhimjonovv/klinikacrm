import React from 'react';
import s from './VisitForm.module.scss';
import Loading from '../../Loading/Loading';
import DoctorPicker from '../DoctorPicker/DoctorPicker';
import StatusPicker from '../StatusPicker/StatusPicker';
import { IMaskInput } from 'react-imask';

const VisitForm = ({
    value,
    onChange,
    errors = {},
    onSubmit,
    loading,
    serverError,
    submitLabel = 'Saqlash',
    submitIcon = 'bi-check-lg',
    title,
}) => {
    const handleField = (name, val) => {
        onChange({ ...value, [name]: val });
    };

    return (
        <form className={s.Form} onSubmit={onSubmit} noValidate>
            {title && <h1>{title}</h1>}

            <div className={s.Input}>
                <p>Shifokor(lar) *</p>
                <DoctorPicker
                    selected={value.doctors}
                    onChange={(ids) => handleField('doctors', ids)}
                    disabled={loading}
                />
                {errors.doctors && <span className={s.ErrorText}>{errors.doctors}</span>}
            </div>

            <div className={s.Input}>
                <p>Shikoyat *</p>
                <textarea
                    rows={3}
                    placeholder="Bemorning shikoyati"
                    value={value.complaint}
                    onChange={(e) => handleField('complaint', e.target.value)}
                    disabled={loading}
                />
                {errors.complaint && <span className={s.ErrorText}>{errors.complaint}</span>}
            </div>

            <div className={s.Row}>
                <div className={s.Input}>
                    <p>Holati</p>

                    <StatusPicker
                        value={value.status}
                        onChange={(status) => handleField('status', status)}
                        disabled={loading}
                    />
                </div>
            </div>

            <div className={s.Input}>
                <p>Qo'shimcha izoh</p>
                <textarea
                    rows={2}
                    placeholder="Ixtiyoriy izoh"
                    value={value.notes}
                    onChange={(e) => handleField('notes', e.target.value)}
                    disabled={loading}
                />
            </div>

            {serverError && (
                <p className={s.ServerError}>
                    <i className="bi bi-exclamation-circle-fill"></i> {serverError}
                </p>
            )}

            <button type="submit" className={s.SubmitBtn} disabled={loading}>
                {loading ? <Loading /> : (<>{submitLabel} <i className={`bi ${submitIcon}`}></i></>)}
            </button>
        </form>
    );
};

export default VisitForm;