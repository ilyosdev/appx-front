import { forwardRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    { isOpen, onClose, title, children, size = 'md', showCloseButton = true, className },
    ref
  ) => {
    const handleEscapeKey = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      },
      [onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'hidden';
        
        const modal = document.getElementById('modal-content');
        if (modal) {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      }

      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = '';
      };
    }, [isOpen, handleEscapeKey]);

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
            aria-modal="true"
            role="dialog"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              variants={backdropVariants}
              transition={{ duration: 0.2 }}
              onClick={handleBackdropClick}
            />

            <motion.div
              ref={ref}
              id="modal-content"
              className={cn(
                'relative w-full rounded-xl border border-surface-700 bg-surface-900 p-6 shadow-2xl',
                sizeClasses[size],
                className
              )}
              variants={contentVariants}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {(title || showCloseButton) && (
                <div className="mb-4 flex items-center justify-between">
                  {title && (
                    <h2 id="modal-title" className="text-lg font-semibold text-white">
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-auto rounded-lg p-1 text-gray-400 transition-colors hover:bg-surface-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label="Close modal"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}

              <div className="text-gray-300">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';
