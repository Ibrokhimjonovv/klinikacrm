import React, { useState, useEffect } from 'react';
import s from './Modal.module.scss';

const Modal = ({ isOpen, onClose, children }) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setClosing(false);
        } else if (shouldRender) {
            // Yopilish animatsiyasini ishga tushiramiz
            setClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setClosing(false);
            }, 300); // SCSS'dagi animatsiya davomiyligi bilan bir xil bo'lishi shart

            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    return (
        <div
            className={`${s.Overlay} ${closing ? s.OverlayClosing : ''}`}
            onClick={onClose}
        >
            <div
                className={`${s.ModalBox} ${closing ? s.ModalBoxClosing : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={s.CloseBtn} onClick={onClose}>
                    <i className="bi bi-x-lg"></i>
                </button>
                {children}
            </div>
        </div>
    );
};

export default Modal;