import s from "./Header.module.scss"
import { useLocation, Link } from 'react-router-dom';
import { useAppContext } from '../../context/context'
import React from 'react';

const menuLinks = {
    doctor: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patientsTitle: 'BIRIKTIRILGAN BEMORLAR',
        patients: [
            { to: '/doctor-waiting-patients', icon: 'bi-hourglass', text: 'Kutilayotgan bemorlar', countKey: 'waiting' },
            { to: '/doctor-progress-patients', icon: 'bi-clock', text: 'Jarayondagi bemorlar', countKey: 'process' },
            { to: '/doctor-complated-patients', icon: 'bi-check-circle', text: 'Yakunlangan bemorlar', countKey: 'completed' },
        ],
        profile: [
            { to: '/doctor-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },

    nurse_recieption: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patientsTitle: 'BEMORLAR',
        patients: [
            { to: '/nurse-patients', icon: 'bi-people', text: 'Bemorlar ro\'yxati' },
        ],
        profile: [
            { to: '/reception-nurse-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },

    nurse: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patientsTitle: 'BEMORLAR',
        patients: [
            { to: '/nurse-patients', icon: 'bi-clock', text: 'Bemorlar ro\'yxati', countKey: 'process' },
        ],
        profile: [
            { to: '/nurse-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },

    patient: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patientsTitle: null,
        patients: [],
        medicines: [
            { to: '/me/treatments-progress-list', icon: 'bi-clock', text: 'Davolanish jarayonim', countKey: 'process' },
            { to: '/me/treatments-complated-list', icon: 'bi-check-circle', text: 'Yakunlangan davolanishlarim', countKey: 'done' },
        ],
        profile: [
            { to: '/patient-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },
}

const Header = () => {
    const { user, loading, logout, collapsed, setCollapsed, patientsCount, doctorCounts, patientCounts } = useAppContext()
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
    } else if (specialty === 'Nurse') { // <-- backend qanday role nomlansa, shunga moslang
        links = menuLinks.nurse
    }

    const isActive = (to) => {
        if (to === '/') {
            return location.pathname === '/'
        }
        return location.pathname === to || location.pathname.startsWith(`${to}/`)
    }

    const userRole = () => {
        if (user?.role === "Doctor") return user?.doctor?.specialty
        else if (user?.role === "Res Admin") return "Qabul hamshirasi"
        else if (user?.role === "Patient") return "Bemor"
        else if (user?.role === "Nurse") return "Hamshira"
        else return "Aniqlanmadi"
    }

    const userName = () => {
        if (user?.role === "Doctor") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else if (user?.role === "Res Admin") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else if (user?.role === "Patient") return (`${user?.patient?.first_name} ${user?.patient?.last_name}`)
        else if (user?.role === "Nurse") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else return "Aniqlanmadi"
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

            <div className={s.LinksWrapper}>
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
                        <p className={s.asosiy}>
                            {links.patientsTitle}
                        </p>

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

                {links && links.medicines?.length > 0 && (
                    <>
                        <p className={s.asosiy}>DAVOLANISH</p>
                        <ul className={s.AsideLinks}>
                            {links.medicines.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        to={link.to}
                                        className={isActive(link.to) ? s.ActiveLink : ''}
                                    >
                                        <span className={s.icon}><i className={`bi ${link.icon}`}></i></span>
                                        <span className={s.text}>{link.text}</span>

                                        {link.countKey && (
                                            <p>{patientCounts[link.countKey] ?? 0}</p>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {links && links.profile?.length > 0 && (
                    <>
                        <p className={s.asosiy}>PROFIL</p>

                        <ul className={s.AsideLinks}>
                            {links.profile.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        to={link.to}
                                        className={isActive(link.to) ? s.ActiveLink : ''}
                                    >
                                        <span className={s.icon}>
                                            <i className={`bi ${link.icon}`}></i>
                                        </span>

                                        <span className={s.text}>
                                            {link.text}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <div className={s.AsideBottom}>

                <div className={s.Me}>
                    <div className={s.ProfileLogo}>
                        {user?.doctor?.first_name ? user?.doctor?.first_name[0].toUpperCase() : user?.patient?.first_name ? user?.patient?.first_name[0].toUpperCase() : "?"}
                    </div>
                    <div className={s.ProfileDatas}>
                        <p>{userName()}</p>
                        <p>{userRole()}</p>
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