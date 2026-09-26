import React, { useState, useEffect } from 'react';
import s from './Modal.module.scss';

const Modal = ({ isOpen, onClose, children, fullWidth = false }) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setClosing(false);
        } else if (shouldRender) {
            setClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setClosing(false);
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // ESC bilan yopish
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!shouldRender) return null;

    return (
        <div
            className={`${s.Overlay} ${closing ? s.OverlayClosing : ''}`}
            onClick={onClose}
        >
            <div
                className={[
                    s.ModalBox,
                    fullWidth ? s.ModalBoxFull : '',
                    closing ? s.ModalBoxClosing : '',
                ].filter(Boolean).join(' ')}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={s.CloseBtn} onClick={onClose} type="button">
                    <i className="bi bi-x-lg"></i>
                </button>
                {children}
            </div>
        </div>
    );
};

export default Modal;