import React from 'react';
import s from "./Loading.module.scss"

const Loading = () => {
    return (
        <span className={s.LoadingSpan}>
            Yuklanmoqda <i className="ti ti-loader" id={s.LoadingAnimation} />
        </span>
    )
}

export default Loading
