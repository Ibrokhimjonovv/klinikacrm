import React from 'react';
import { useNavigate } from 'react-router-dom';
import s from './NotFound.module.scss';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className={s.Page}>
            <div className={s.Content}>
                <svg
                    className={s.Pulse}
                    viewBox="0 0 400 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        className={s.PulseLine}
                        d="M0 40 H120 L138 40 L150 10 L164 68 L178 40 L192 40 L204 24 L216 40 H400"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle className={s.PulseDot} cx="400" cy="40" r="5" fill="currentColor" />
                </svg>

                <h1 className={s.Number}>404</h1>

                <h2 className={s.Title}>Bunday sahifa topilmadi</h2>

                <p className={s.Subtitle}>
                    Siz izlagan sahifa o'chirilgan, ko'chirilgan yoki umuman mavjud bo'lmagan bo'lishi mumkin.
                </p>

                <div className={s.Actions}>
                    <button type="button" className={s.PrimaryBtn} onClick={() => navigate('/')}>
                        Bosh sahifaga qaytish
                    </button>

                    <button type="button" className={s.SecondaryBtn} onClick={() => navigate(-1)}>
                        Orqaga qaytish
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;