
import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

const Alert: React.FC<AlertProps> = ({ message, type = 'error' }) => {
  let bgColor, borderColor, textColor, Icon, iconColor;

  switch (type) {
    case 'success':
      bgColor = 'bg-green-50';
      borderColor = 'border-green-300';
      textColor = 'text-green-700';
      iconColor = 'text-green-500';
      Icon = CheckCircleIcon;
      break;
    case 'info':
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-300';
      textColor = 'text-blue-700';
      iconColor = 'text-blue-500';
      Icon = InformationCircleIcon;
      break;
    case 'error':
    default:
      bgColor = 'bg-red-50';
      borderColor = 'border-red-300';
      textColor = 'text-red-700';
      iconColor = 'text-red-500';
      Icon = ExclamationTriangleIcon;
      break;
  }

  return (
    <div className={`p-4 border ${borderColor} ${bgColor} rounded-lg shadow-sm flex items-start space-x-3 my-4`}>
      <Icon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <p className={`text-sm ${textColor}`}>{message}</p>
    </div>
  );
};

export default Alert;