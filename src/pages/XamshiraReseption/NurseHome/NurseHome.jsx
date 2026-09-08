import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom"
import s from "./NurseHome.module.scss"
import Modal from '../../../components/Modal/Modal';
import PatientAdmission from '../../../components/XamshiraReseption/PatientAdmission/PatientAdmission';
import { useAppContext } from '../../../context/context';
import { api } from '../../../App';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const NurseHome = () => {
    const { user, patients: todayAdmissions, patientsLoading: loading, patientsError: error, fetchPatients } = useAppContext()
    const [showAdmission, setShowAdmission] = useState(false)



    useEffect(() => {
        fetchPatients()
    }, [])


    // Statistik ma'lumotlar
    const stats = [
        {
            title: 'Bugun qabul qilingan',
            value: todayAdmissions.length,
            icon: 'bi-person-check-fill',
            variant: 'orange'
        },
        {
            title: 'Navbatda kutmoqda',
            value: todayAdmissions.filter(p => p.doctor === 'Kutilmoqda').length,
            icon: 'bi-hourglass-split',
            variant: 'blue'
        },
        {
            title: 'Shifokorga yuborilgan',
            value: todayAdmissions.filter(p => p.doctor !== 'Kutilmoqda').length,
            icon: 'bi-arrow-right-circle-fill',
            variant: 'green'
        },
    ]

    // Yuklanish holati
    if (loading) {
        return (
            <section className={s.HomeContainer}>
                <div className={s.LoadingContainer}>
                    <i className="bi bi-arrow-repeat spin"></i>
                    <p>Ma'lumotlar yuklanmoqda...</p>
                </div>
            </section>
        )
    }

    // Xatolik holati
    if (error) {
        return (
            <section className={s.HomeContainer}>
                <div className={s.ErrorContainer}>
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <p>Ma'lumotlarni yuklashda xatolik yuz berdi: {error}</p>
                    <button onClick={() => window.location.reload()}>Qayta urinish</button>
                </div>
            </section>
        )
    }

    return (
        <section className={s.HomeContainer}>

            <div className={s.TopRow}>
                <div>
                    <p className={s.Breadcrumb}>Bosh sahifa</p>
                    <p>Xush kelibsiz, <span>{user?.doctor?.first_name || 'Xodim'}</span></p>
                </div>
                <button
                    className={s.AddPatientBtn}
                    onClick={() => setShowAdmission(true)}
                >
                    <i className="bi bi-plus-lg"></i> Bemor qabul qilish
                </button>
            </div>

            <div className={s.StatsRow}>
                {stats.map((stat, i) => (
                    <div key={i} className={`${s.StatCard} ${s[`Variant_${stat.variant}`]}`}>
                        <div className={s.StatIcon}>
                            <i className={`bi ${stat.icon}`}></i>
                        </div>
                        <div>
                            <h2>{stat.value}</h2>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={s.ListCard}>
                <div className={s.ListHead}>
                    <div className={s.ListHeadLeft}>
                        <h3>Bugun ro'yxatga olingan bemorlar</h3>
                        <span className={s.CountBadge}>{todayAdmissions.length} ta</span>
                    </div>
                    <Link to="/nurse-patients">Barchasini ko'rish</Link>
                </div>

                {todayAdmissions.length === 0 ? (
                    <p className={s.Empty}>Bugun hali hech kim qabul qilinmagan</p>
                ) : (
                    <ul>
                        {todayAdmissions.map((p) => (
                            <li key={p.id}>
                                <Link to={`/nurse-patients/${p.id}`}>
                                    <div className={s.PatientLeft}>
                                        <div className={s.Avatar}>{p.name ? p.name[0] : '?'}</div>
                                        <div>
                                            <p>{p.name}</p>
                                            <span>{p.complaint}</span>
                                        </div>
                                    </div>
                                    <div className={s.PatientRight}>
                                        {/* <span className={s.Time}>{p.time}</span> */}
                                        <DateTimeFormatter
                                            date={p.time}
                                            format="datetime"
                                            className={s.Time}
                                        />
                                        <span className={`${s.DoctorBadge}`}>
                                            {p.doctor_name} {p.doctor_surename}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal
                isOpen={showAdmission}
                onClose={() => setShowAdmission(false)}
            >
                <PatientAdmission onSuccess={() => setShowAdmission(false)} />
            </Modal>
        </section>
    )
}

export default NurseHome