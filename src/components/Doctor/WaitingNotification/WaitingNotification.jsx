import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './WaitingNotification.module.scss';
import { useWaitingPatients } from '../../../context/WaitingPatientsContext/WaitingPatientsContext';

const STORAGE_KEY = 'closed_waiting_notifications';

const WaitingPatientNotifications = () => {
    const { latestPatient } = useWaitingPatients();
    const navigate = useNavigate();

    const [closedNotifications, setClosedNotifications] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed)) {
                    setClosedNotifications(parsed);
                }
            } catch (error) {
                console.error(
                    'Closed notifications parse error:',
                    error
                );

                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    const getNotificationId = (patient) => {
        return `${patient.id}_${patient.created_at}`;
    };

    const closeNotification = () => {
        if (!latestPatient) return;

        const notificationId =
            getNotificationId(latestPatient);

        const updated = [
            ...closedNotifications,
            notificationId,
        ];

        setClosedNotifications(updated);

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(updated)
        );
    };

    const notificationId = latestPatient
        ? getNotificationId(latestPatient)
        : null;

    const isClosed =
        notificationId &&
        closedNotifications.includes(notificationId);

    const openPatient = () => {
        if (!latestPatient) return;

        navigate(
            `/doctor-waiting-patients/${latestPatient.id}/diagnostics/`
        );
        closeNotification()
    };

    if (!latestPatient || isClosed) {
        return null;
    }

    return (
        <div className={s.NotificationContainer}>
            <div className={s.Notification}>
                <div
                    className={s.Content}
                    onClick={openPatient}
                >
                    <div className={s.Icon}>
                        <i className="bi bi-bell-fill"></i>
                    </div>

                    <div className={s.Info}>
                        <h4>
                            Yangi bemor navbatda
                        </h4>   

                        <p>
                            {latestPatient.first_name}{' '}
                            {latestPatient.last_name}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className={s.CloseBtn}
                    onClick={closeNotification}
                    aria-label="Notificationni yopish"
                >
                    <i className="bi bi-x"></i>
                </button>
            </div>
        </div>
    );
};

export default WaitingPatientNotifications;