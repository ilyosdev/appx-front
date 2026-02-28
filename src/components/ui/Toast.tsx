import {
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { ToastContext, type Toast } from '../../hooks/useToast';

type ToastVariant = Toast['variant'];

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-primary-500/30 bg-primary-500/10',
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-primary-400" />,
};

const toastVariants = {
  hidden: { opacity: 0, x: 50, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 50, scale: 0.95 },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg',
        'bg-surface-900 border-surface-700',
        variantStyles[toast.variant]
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0">{variantIcons[toast.variant]}</div>

      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-gray-400">{toast.description}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-surface-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

interface ToastProviderProps {
  children: ReactNode;
  duration?: number;
}

export function ToastProvider({ children, duration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      const newToast: Toast = { ...options, id };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismiss(id);
      }, duration);
    },
    [dismiss, duration]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}


