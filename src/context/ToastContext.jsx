import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import s from './Toast.module.scss';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        if (timers.current[id]) {
            clearTimeout(timers.current[id]);
            delete timers.current[id];
        }
    }, []);

    // type: 'success' | 'error' | 'warning' | 'info'
    const showToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = (idCounter += 1);
        setToasts(prev => [...prev, { id, message, type }]);

        timers.current[id] = setTimeout(() => {
            removeToast(id);
        }, duration);

        return id;
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}

            <div className={s.ToastContainer}>
                {toasts.map(t => (
                    <div key={t.id} className={`${s.Toast} ${s[t.type]}`}>
                        <i className={`bi ${
                            t.type === 'success' ? 'bi-check-circle-fill'
                            : t.type === 'error' ? 'bi-x-circle-fill'
                            : t.type === 'warning' ? 'bi-exclamation-triangle-fill'
                            : 'bi-info-circle-fill'
                        }`}></i>
                        <span>{t.message}</span>
                        <button type="button" onClick={() => removeToast(t.id)}>
                            <i className="bi bi-x"></i>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast faqat ToastProvider ichida ishlatilishi kerak');
    return ctx;
};