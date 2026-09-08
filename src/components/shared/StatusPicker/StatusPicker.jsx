import React from 'react';

import s from './StatusPicker.module.scss';

const STATUSES = [
    {
        value: 'WAITING',
        label: 'Kutmoqda',
        icon: 'bi-hourglass-split',
    },
    {
        value: 'IN_PROGRESS',
        label: 'Jarayonda',
        icon: 'bi-activity',
    },
    {
        value: 'DONE',
        label: 'Tugallangan',
        icon: 'bi-check-circle',
    },
];

const StatusPicker = ({
    value,
    onChange,
    disabled = false,
}) => {
    return (
        <div className={s.StatusPicker}>
            {STATUSES.map((status) => {
                const isSelected = value === status.value;

                return (
                    <div
                        key={status.value}
                        className={`${s.StatusCard} ${
                            isSelected ? s.ActiveStatus : ''
                        }`}
                        onClick={() => !disabled && onChange(status.value)}
                    >
                        {isSelected && (
                            <div className={s.CheckBadge}>
                                <i className="bi bi-check-lg"></i>
                            </div>
                        )}

                        <i className={`bi ${status.icon}`}></i>

                        <span>{status.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default StatusPicker;