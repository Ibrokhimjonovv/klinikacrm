import s from "./Header.module.scss"
import { useLocation, Link } from 'react-router-dom';
import { useAppContext } from '../../context/context'
import React from 'react';

const menuLinks = {
    doctor: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patients: [
            { to: '/doctor-waiting-patients', icon: 'bi-hourglass', text: 'Kutilayotgan bemorlar', countKey: 'waiting' },
            { to: '/doctor-progress-patients', icon: 'bi-clock', text: 'Jarayondagi bemorlar', countKey: 'process' },
            { to: '/doctor-complated-patients', icon: 'bi-check-circle', text: 'Yakunlangan bemorlar', countKey: 'completed' },
        ],
    },
    nurse_recieption: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
            { to: '/nurse-patients', icon: 'bi-people', text: 'Bemorlar' },
        ],
        patients: [],
    },
    patient: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patients: [],
    },
}

const Header = () => {
    const { user, loading, logout, collapsed, setCollapsed, patientsCount, doctorCounts } = useAppContext()
    const location = useLocation()

    if (location.pathname === '/sign-in') {
        return null
    }

    if (loading) return null

    const specialty = user?.role

    let links = null
    if (specialty === 'Doctor') {
        links = menuLinks.doctor
    } else if (specialty === 'Res Admin') {
        links = menuLinks.nurse_recieption
    } else if (specialty === 'Patient') { // <-- backend qanday role nomlansa, shunga moslang
        links = menuLinks.patient
    }

    const isActive = (to) => {
        if (to === '/') {
            return location.pathname === '/'
        }
        return location.pathname === to || location.pathname.startsWith(`${to}/`)
    }

    return (
        <div className={`${s.aside} ${collapsed ? s.collapsed : ''}`}>
            <div className={s.Logo}>
                <div className={s.LogoImg}>
                    <div className={s.LogoMark}>✦</div>
                    <span className={s.Brand}>Klinika CRM</span>
                </div>
                <button
                    className={s.arrow}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <i className={`bi ${collapsed ? 'bi-caret-right-square-fill' : 'bi-caret-left-square-fill'}`}></i>
                </button>
            </div>

            <p className={s.asosiy}>ASOSIY</p>

            <ul className={s.AsideLinks}>
                {links ? (
                    links.main.map((link, index) => (
                        <li key={index}>
                            <Link
                                to={link.to}
                                className={isActive(link.to) ? s.ActiveLink : ''}
                            >
                                <span className={s.icon}><i className={`bi ${link.icon}`}></i></span>
                                <span className={s.text}>{link.text}</span>

                                {user?.role === 'Res Admin' && link.to === '/nurse-patients' && (
                                    <p>{patientsCount}</p>
                                )}
                            </Link>
                        </li>
                    ))
                ) : (
                    <li className={s.NoRole}>
                        <span className={s.text}>Menyu mavjud emas</span>
                    </li>
                )}
            </ul>

            {links && links.patients.length > 0 && (
                <>
                    <p className={s.asosiy}>BIRIKTIRILGAN BEMORLAR</p>
                    <ul className={s.AsideLinks}>
                        {links.patients.map((link, index) => (
                            <li key={index}>
                                <Link
                                    to={link.to}
                                    className={isActive(link.to) ? s.ActiveLink : ''}
                                >
                                    <span className={s.icon}><i className={`bi ${link.icon}`}></i></span>
                                    <span className={s.text}>{link.text}</span>

                                    {link.countKey && (
                                        <p>{doctorCounts[link.countKey] ?? 0}</p>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className={s.AsideBottom}>

                <div className={s.Me}>
                    <div className={s.ProfileLogo}>
                        {user?.doctor?.first_name ? user?.doctor?.first_name[0].toUpperCase() : '?'}
                    </div>
                    <div className={s.ProfileDatas}>
                        <p>{user?.doctor?.first_name || 'Xodim'} {user?.doctor?.middle_name || 'Xodim'}</p>
                        <p>{user?.role === "Res Admin" ? "Qabul Hamshirasi" : user?.role === "Doctor" ? "Bosh doktor" : "No'malum"}</p>
                    </div>
                </div>

                <button className={s.Logout} onClick={logout}>
                    <i className="bi bi-box-arrow-left"></i>
                    <span className={s.text}>Chiqish</span>
                </button>
            </div>
        </div>
    )
}

export default Header