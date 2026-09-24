import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';

import { api } from '../../App';
import { useAppContext } from '../context';

const WaitingPatientsContext = createContext(null);

export const WaitingPatientsProvider = ({ children }) => {
    const { user } = useAppContext();

    const [waitingPatients, setWaitingPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWaiting = useCallback(async () => {
        const token = localStorage.getItem('hospital_access');

        if (!token) {
            setLoading(false);
            return;
        }

        if (user?.role !== 'Doctor') {
            setWaitingPatients([]);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${api}/waitlist/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (res.status === 401) {
                console.warn('Waiting patients: 401 Unauthorized');
                return;
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            const formatted = (Array.isArray(data) ? data : []).map((p) => ({
                id: p.id,
                first_name: p.first_name || '',
                last_name: p.last_name || '',
                middle_name: p.middle_name || '',
                birth_date:
                    p.date_of_birth ||
                    p.birth_date ||
                    null,
                gender: p.gender || '',
                phone:
                    p.contact_number ||
                    p.phone ||
                    '—',
                created_at: p.created_at || null,
            }));

            setWaitingPatients(formatted);
        } catch (err) {
            console.error(
                'Waiting patients fetch error:',
                err
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchWaiting();
        const interval = setInterval(() => {
            fetchWaiting();
        }, 60000);

        return () => {
            clearInterval(interval);
        };
    }, [fetchWaiting]);

    const latestPatient = waitingPatients.reduce(
        (latest, patient) => {
            if (!latest) {
                return patient;
            }

            return Number(patient.id) > Number(latest.id)
                ? patient
                : latest;
        },
        null
    );

    return (
        <WaitingPatientsContext.Provider
            value={{
                waitingPatients,
                latestPatient,
                loading,
                refetch: fetchWaiting,
            }}
        >
            {children}
        </WaitingPatientsContext.Provider>
    );
};

export const useWaitingPatients = () => {
    const ctx = useContext(WaitingPatientsContext);

    if (!ctx) {
        throw new Error(
            'useWaitingPatients must be used inside WaitingPatientsProvider'
        );
    }

    return ctx;
};