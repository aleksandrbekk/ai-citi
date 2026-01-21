import React from 'react';

interface LogoProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', width = 'auto', height = 'auto' }) => {
    return (
        <img
            src="/images/logo.png"
            alt="AI CITY"
            // mix-blend-multiply делает белый фон изображения прозрачным,
            // сохраняя при этом тени и детали. Работает идеально на светлом фоне.
            className={`mix-blend-multiply object-contain ${className}`}
            style={{ width, height }}
        />
    );
};
