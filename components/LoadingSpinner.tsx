
import React from 'react';

interface LoadingSpinnerProps {
  small?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ small }) => {
  const sizeClasses = small ? 'h-5 w-5' : 'h-8 w-8';
  return (
    <div className={`animate-spin rounded-full ${sizeClasses} border-b-2 border-t-2 border-gray-700`}></div>
  );
};

export default LoadingSpinner;