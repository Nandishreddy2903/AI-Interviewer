
import React from 'react';
import { LoaderCircleIcon } from './icons';

interface LoadingViewProps {
  message: string;
}

const LoadingView: React.FC<LoadingViewProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-fade-in">
      <LoaderCircleIcon className="w-16 h-16 text-brand-primary animate-spin mb-6" />
      <p className="text-xl text-dark-text">{message}</p>
    </div>
  );
};

export default LoadingView;
