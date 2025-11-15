import React from 'react';

interface IconProps {
  className?: string;
}

export const CheckCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM9.53 12.53a.75.75 0 0 1-1.06-1.06l3-3a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1-1.06 1.06l-5.47-5.47-2.47 2.47z" clipRule="evenodd"/>
  </svg>
);