import React, { useEffect, useState } from 'react';
import s from "./NursePatients.module.scss"
import { api } from '../../../App';
import { Link } from 'react-router-dom';
import DateTimeFormatter from '../../../components/shared/DateTimeFormatter/DateTimeFormatter';

const NursePatients = () => {

    const [todayAdmissions, setTodayAdmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // API dan bemorlarni olish
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem('hospital_access')
                const response = await fetch(`${api}/patientInfo/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()

                // API dan kelgan ma'lumotlarni kerakli formatga o'tkazish
                // API strukturasi bo'yicha moslashtirish kerak
                const formattedPatients = data.map((patient, index) => ({
                    id: patient.id || index + 1,
                    name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || 'Noma\'lum',
                    time: patient.create_date || patient.created_at || '00:00',
                    complaint:
                        patient.complaints?.at(-1)?.complaint ||
                        "Ko'rsatilmagan",
                    // doctor: patient.doctor_name || patient.doctor || 'Kutilmoqda'
                    doctor_name: patient.created_by.first_name || patient.doctor || 'Kutilmoqda',
                    doctor_surename: patient.created_by.middle_name || patient.doctor || 'Kutilmoqda'
                }))

                console.log(formattedPatients);


                setTodayAdmissions(formattedPatients)
                setLoading(false)
            } catch (err) {
                console.error('API xatosi:', err)
                setError(err.message)
                setLoading(false)
            }
        }

        fetchPatients()
    }, [])

    return (
        <div className={s.ListCard}>
            <div className={s.ListHead}>
                <h3>Bemorlar ro'yxati</h3>
                <span className={s.CountBadge}>{todayAdmissions.length} ta</span>
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
    )
}

export default NursePatients
