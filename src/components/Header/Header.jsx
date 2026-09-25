import s from "./Header.module.scss"
import { useLocation, Link } from 'react-router-dom';
import { useAppContext } from '../../context/context'
import React, { useState } from 'react';

const menuLinks = {
    admin: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
            { to: '/services', icon: 'bi-sliders2', text: 'Servislar' },
            { to: '/admin-rooms', icon: 'bi-hospital', text: 'Xonalar' },
        ],
        patientsTitle: null,
        patients: [
        ],
        roomsTitle: null,
        rooms: [
        ],
        profile: [
        ]
    },
    doctor: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patientsTitle: 'BIRIKTIRILGAN BEMORLAR',
        patients: [
            {
                to: '/doctor-waiting-patients',
                icon: 'bi-hourglass',
                text: 'Kutilayotgan bemorlar',
                countKey: 'waiting',
                // Bosilganda ochiladigan dropdown ichidagi 2 link:
                children: [
                    { to: '/doctor-waiting-patients?flow=diagnostics', icon: 'bi-camera', text: 'Diagnostikaga yuborish' },
                    { to: '/doctor-waiting-patients?flow=treatment', icon: 'bi-clipboard2-pulse', text: 'Davolash rejasi' },
                ],
            },
            { to: '/doctor-progress-patients', icon: 'bi-clock', text: 'Jarayondagi bemorlar', countKey: 'process' },
            { to: '/doctor-complated-patients', icon: 'bi-check-circle', text: 'Yakunlangan bemorlar', countKey: 'completed' },
        ],
        roomsTitle: 'Xonalar',
        rooms: [
            { to: '/doctor-rooms', icon: 'bi-hospital', text: 'Xonalar' },
        ],
        profile: [
            { to: '/doctor-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },
    assistantDoctor: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
            { to: '/waiting-patients', icon: 'bi-sliders2', text: 'Bemorlar' },
        ],
        patientsTitle: null,
        patients: [
        ],
        roomsTitle: null,
        rooms: [
        ],
        profile: [
            { to: '/doctor-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },
    nurseRecieption: {
        main: [
            { to: '/', icon: 'bi-house-door', text: 'Bosh sahifa' },
        ],
        patientsTitle: 'BEMORLAR',
        patients: [
            { to: '/nurse-patients', icon: 'bi-people', text: 'Bemorlar ro\'yxati' },
        ],
        roomsTitle: null,
        rooms: [
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
            { to: '/nurse-inpatients', icon: 'bi-hospital', text: 'Yotib davolanayotgan bemorlar' },
        ],
        roomsTitle: null,
        rooms: [
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
        roomsTitle: null,
        rooms: [
        ],
        profile: [
            { to: '/patient-profile', icon: 'bi-person-circle', text: 'Shaxsiy kabinet' }
        ]
    },
}

const parseTo = (to) => {
    const [path, query] = to.split('?')
    const params = new URLSearchParams(query || '')
    return { path, flow: params.get('flow') }
}

const Header = () => {
    const { user, loading, logout, collapsed, setCollapsed, patientsCount, doctorCounts, patientCounts } = useAppContext()
    const location = useLocation()
    const [openMenu, setOpenMenu] = useState(null)

    if (location.pathname === '/sign-in') {
        return null
    }

    if (loading) return null

    const specialty = user?.role

    let links = null
    if (specialty === 'Doctor') {
        links = menuLinks.doctor
    } else if (specialty === 'ResNurse') {
        links = menuLinks.nurseRecieption
    } else if (specialty === 'Patient') {
        links = menuLinks.patient
    } else if (specialty === 'Nurse') {
        links = menuLinks.nurse
    } else if (specialty === 'Admin') {
        links = menuLinks.admin
    } else if (specialty === "AssistantDoctor") {
        links = menuLinks.assistantDoctor
    }

    const isActive = (to) => {
        if (to === '/') {
            return location.pathname === '/'
        }
        return location.pathname === to || location.pathname.startsWith(`${to}/`)
    }

    const isChildActive = (child) => {
        const { path, flow } = parseTo(child.to)
        if (location.pathname !== path && !location.pathname.startsWith(`${path}/`)) return false
        const currentFlow = new URLSearchParams(location.search).get('flow')
        return flow ? currentFlow === flow : true
    }

    const isAnyChildActive = (children) => children?.some(isChildActive)

    const toggleMenu = (key) => {
        setOpenMenu(prev => (prev === key ? null : key))
    }

    const userRole = () => {
        if (user?.role === "Doctor") return user?.doctor?.specialty
        else if (user?.role === "ResNurse") return "Qabul hamshirasi"
        else if (user?.role === "Patient") return "Bemor"
        else if (user?.role === "Nurse") return "Hamshira"
        else if (user?.role === "Admin") return "Admin"
        else if (user?.role === "AssistantDoctor") return "Doktor"
        else return "Aniqlanmadi"
    }

    const userName = () => {
        if (user?.role === "Doctor") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else if (user?.role === "ResNurse") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else if (user?.role === "Patient") return (`${user?.patient?.first_name} ${user?.patient?.last_name}`)
        else if (user?.role === "Nurse") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else if (user?.role === "AssistantDoctor") return (`${user?.doctor?.first_name} ${user?.doctor?.last_name}`)
        else if (user?.role === "Admin") return (`Sayt admini!`)
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
                                </Link>
                            </li>
                        ))
                    ) : (
                        <li className={s.NoRole}>
                            <div className={s.NoRoleIcon}>
                                <i className="bi bi-compass"></i>
                            </div>
                            <p className={s.NoRoleTitle}>Menyu topilmadi</p>
                            <p className={s.NoRoleText}>
                                Rolingiz uchun bo'lim biriktirilmagan. Administratorga murojaat qiling.
                            </p>
                        </li>
                    )}
                </ul>

                {links && links.patients.length > 0 && (
                    <>
                        <p className={s.asosiy}>
                            {links.patientsTitle}
                        </p>

                        <ul className={s.AsideLinks}>
                            {links.patients.map((link, index) => {
                                if (link.children?.length > 0) {
                                    const childActive = isAnyChildActive(link.children)
                                    const expanded = openMenu === link.to || childActive

                                    return (
                                        <li key={index} className={s.HasSubmenu}>
                                            <button
                                                type="button"
                                                className={`${s.SubmenuToggle} ${childActive ? s.ActiveLink : ''}`}
                                                onClick={() => toggleMenu(link.to)}
                                                aria-expanded={expanded}
                                            >
                                                <span className={s.icon}><i className={`bi ${link.icon}`}></i></span>
                                                <span className={s.text}>{link.text}</span>

                                                {link.countKey && (
                                                    <p>{doctorCounts[link.countKey] ?? 0}</p>
                                                )}

                                                <i className={`bi bi-chevron-down ${s.chevron} ${expanded ? s.chevronOpen : ''}`}></i>
                                            </button>

                                            {expanded && (
                                                <ul className={s.SubLinks}>
                                                    {link.children.map((child, ci) => (
                                                        <li key={ci}>
                                                            <Link
                                                                to={child.to}
                                                                className={isChildActive(child) ? s.ActiveLink : ''}
                                                            >
                                                                <span className={s.icon}><i className={`bi ${child.icon}`}></i></span>
                                                                <span className={s.text}>{child.text}</span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    )
                                }

                                return (
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

                                            {user?.role === 'ResNurse' && link.to === '/nurse-patients' && (
                                                <p>{patientsCount}</p>
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
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

                {links && links.rooms?.length > 0 && (
                    <>
                        <p className={s.asosiy}>
                            {links.roomsTitle}
                        </p>

                        <ul className={s.AsideLinks}>
                            {links.rooms.map((link, index) => (
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
                        {user?.doctor?.first_name ? user?.doctor?.first_name[0].toUpperCase() : user?.patient?.first_name ? user?.patient?.first_name[0].toUpperCase() : user?.role == "Admin" ? `A` : "?"}
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