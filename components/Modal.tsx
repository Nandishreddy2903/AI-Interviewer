import React from 'react';
import { XIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  // This is a pretty standard modal implementation. Nothing too fancy.
  // The outer div is the semi-transparent backdrop. Clicking it will close the modal.
  // We attach the `onClose` handler to it.
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* 
        The inner div is the actual modal content. We add an `onClick` handler here
        that calls `e.stopPropagation()`. This is important because it prevents a click
        inside the modal from "bubbling up" to the backdrop and accidentally closing it.
      */}
      <div 
        className="bg-dark-card rounded-lg shadow-2xl p-6 w-full max-w-md m-4 relative animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-dark-subtle pb-3 mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-dark-text hover:bg-dark-subtle transition-colors" 
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
