import React, { useState } from 'react';
import s from './EditProfile.module.scss';
import Loading from '../../Loading/Loading';
import { useAppContext } from '../../../context/context';
import { api } from '../../../App';
import { IMaskInput } from 'react-imask';

// role: 'doctor' | 'patient' | 'nurse' — user obyektidan qaysi kalitdan o'qish kerakligini bildiradi
const EditProfile = ({ role = 'doctor', title = "Profilni tahrirlash", subtitle, onSubmit }) => {
    const { user, fetchMe } = useAppContext();

    const source = user?.[role] || {};

    const [formData, setFormData] = useState({
        first_name: source.first_name || '',
        last_name: source.last_name || '',
        middle_name: source.middle_name || '',
        department: source.department || '',
        contact_number: source.contact_number || '',
        address: source.address || '',
        profile_image: null,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFormData(prev => ({
            ...prev,
            profile_image: file
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.first_name.trim())
            newErrors.first_name = "Ism kiritilishi shart";

        if (!formData.last_name.trim())
            newErrors.last_name = "Familiya kiritilishi shart";

        if (!formData.contact_number.trim())
            newErrors.contact_number = "Telefon raqami kiritilishi shart";

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            const token = localStorage.getItem('hospital_access');

            const body = new FormData();
            body.append('first_name', formData.first_name);
            body.append('last_name', formData.last_name);
            body.append('middle_name', formData.middle_name);
            body.append('department', formData.department);
            body.append('contact_number', formData.contact_number);
            body.append('address', formData.address);

            if (formData.profile_image) {
                body.append('profile_image', formData.profile_image);
            }

            const res = await fetch(`${api}/profile/edit/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.detail || 'Xatolik yuz berdi');
            }

            await fetchMe(); // <-- Context'dan olinadi, endi ReferenceError bo'lmaydi

            if (onSubmit) {
                onSubmit(data);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className={s.EditProfileSection}>
            <div className={s.StepHeader}>
                <h1>
                    <i className="bi bi-pencil-square"></i>
                    {title}
                </h1>
                {subtitle && <p>{subtitle}</p>}
            </div>

            <form className={s.EditForm} onSubmit={handleSubmit}>
                <div className={s.ProfileImageSection}>
                    <div className={s.ProfileImage}>
                        {formData.profile_image ? (
                            <img
                                src={URL.createObjectURL(formData.profile_image)}
                                alt=""
                            />
                        ) : (
                            <div className={s.ProfilePlaceholder}>
                                {formData.first_name?.[0] || 'D'}
                            </div>
                        )}
                    </div>

                    <label className={s.UploadBtn}>
                        <i className="bi bi-camera-fill"></i>
                        Rasmni almashtirish
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleImageChange}
                        />
                    </label>
                </div>

                <div className={s.Row}>
                    <div className={s.Input}>
                        <p>Ism *</p>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                        />
                        {errors.first_name &&
                            <span className={s.ErrorText}>{errors.first_name}</span>
                        }
                    </div>

                    <div className={s.Input}>
                        <p>Familiya *</p>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                        />
                        {errors.last_name &&
                            <span className={s.ErrorText}>{errors.last_name}</span>
                        }
                    </div>
                </div>

                <div className={s.Row}>
                    <div className={s.Input}>
                        <p>Sharif</p>
                        <input
                            type="text"
                            name="middle_name"
                            value={formData.middle_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={s.Input}>
                        <p>Telefon *</p>
                        <IMaskInput
                            mask="+998 00 000 00 00"
                            name="contact_number"
                            placeholder="+998 XX XXX XX XX"
                            value={formData.contact_number}
                            unmask={false}
                            lazy={false}
                            overwrite
                            onAccept={(value) => {
                                handleChange({ target: { name: 'contact_number', value } });
                            }}
                            disabled={loading}
                        />
                        {errors.contact_number &&
                            <span className={s.ErrorText}>{errors.contact_number}</span>
                        }
                    </div>
                </div>

                <div className={s.Input}>
                    <p>Manzil</p>
                    <textarea
                        rows={4}
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                    />
                </div>

                <button type="submit" className={s.SubmitBtn} disabled={loading}>
                    {loading
                        ? <Loading />
                        : (
                            <>
                                <i className="bi bi-check-lg"></i>
                                Saqlash
                            </>
                        )}
                </button>
            </form>
        </section>
    );
};

export default EditProfile;