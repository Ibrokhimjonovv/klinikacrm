import React, { useState } from 'react';
import s from './Login.module.scss';
import { Link, useNavigate } from "react-router-dom";
import Loading from '../../components/Loading/Loading';
import { api } from '../../App';
import { useAppContext } from '../../context/context';
import logo from "../../assets/images/crm.png"

const Login = () => {
    const navigate = useNavigate();
    const { fetchMe } = useAppContext();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const showPasswordHandle = () => {
        setShowPassword(!showPassword);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.username.trim()) {
            newErrors.username = "Login kiritilishi shart";
        }
        if (!formData.password) {
            newErrors.password = "Parol kiritilishi shart";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');

        if (!validate()) return;

        setLoading(true);
        try {
            const res = await fetch(`${api}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setServerError(data?.detail || data?.message || "Login yoki parol noto'g'ri");
                return;
            }

            localStorage.setItem('hospital_access', data.access);
            localStorage.setItem('hospital_refresh', data.refresh);

            await fetchMe();

            navigate('/');

        } catch (err) {
            setServerError("Serverga ulanishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className={s.LoginSection}>
            <div className={s.LoginWrap}>

                {/* Chap panel — brendlash */}
                <div className={s.BrandPanel}>
                    <div className={s.Circle1}></div>
                    <div className={s.Circle2}></div>
                    <div className={s.Circle3}></div>

                    <div className={s.BrandContent}>
                        <div className={s.LogoImg}>
                            {/* <img src={logo} alt="" />
                                            <span>CRM</span> */}
                            <div className={s.LogoMark}>✦</div>
                            <span className={s.Brand}>Klinika CRM</span>
                        </div>

                        <h2>Bemorlarni boshqarish endi osonroq</h2>
                        <p>Shifokorlar, hamshiralar va reseptionlar uchun yagona tizim — qabullar, tashxislar va bemorlar bir joyda.</p>

                        <div className={s.Features}>
                            <div className={s.FeatureItem}>
                                <i className="bi bi-check-circle-fill"></i>
                                <span>Bemorlar tarixini kuzatish</span>
                            </div>
                            <div className={s.FeatureItem}>
                                <i className="bi bi-check-circle-fill"></i>
                                <span>Tez va oson qabul qilish</span>
                            </div>
                            <div className={s.FeatureItem}>
                                <i className="bi bi-check-circle-fill"></i>
                                <span>Real vaqtda statistikalar</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* O'ng panel — forma */}
                <div className={s.FormPanel}>
                    <div className={s.FormInner}>

                        <div className={s.MobileLogo}>
                            <img src={logo} alt="CRM" />
                            <span>MedCRM</span>
                        </div>

                        <h1>Xush kelibsiz!</h1>
                        <p className={s.SubText}>Tizimga kirish uchun ma'lumotlaringizni kiriting</p>

                        <form className={s.LoginInputs} onSubmit={handleSubmit} noValidate>
                            <div className={s.Input}>
                                <p>Login</p>
                                <div className={s.InpRow}>
                                    <i className="bi bi-person"></i>
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder='Loginingizni kiriting'
                                        value={formData.username}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>
                                {errors.username && <span className={s.ErrorText}>{errors.username}</span>}
                            </div>

                            <div className={s.Input}>
                                <p>Parol</p>
                                <div className={s.InpRow}>
                                    <i className="bi bi-lock"></i>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder='Parolingizni kiriting'
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className={s.ShowBtn}
                                        onClick={showPasswordHandle}
                                    >
                                        {showPassword
                                            ? <i className="bi bi-eye-fill"></i>
                                            : <i className="bi bi-eye-slash-fill"></i>
                                        }
                                    </button>
                                </div>
                                {errors.password && <span className={s.ErrorText}>{errors.password}</span>}
                            </div>

                            {serverError && (
                                <p className={s.ServerError}>
                                    <i className="bi bi-exclamation-circle-fill"></i> {serverError}
                                </p>
                            )}

                            <button type="submit" className={s.LoginBtn} disabled={loading}>
                                {loading ? <Loading /> : (
                                    <>Kirish <i className="bi bi-arrow-right"></i></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Login;