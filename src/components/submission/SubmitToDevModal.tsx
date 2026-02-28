import { useState } from 'react';
import { X, Rocket, Clock, Zap, Check, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { BUILD_SUBMISSION_PRICES } from '@/lib/payments';
import { cn } from '@/lib/utils';

type QueueType = 'general' | 'priority';

interface SubmitToDevModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const queueOptions: Array<{
  type: QueueType;
  title: string;
  price: number;
  timeline: string;
  description: string;
  icon: typeof Clock;
  features: string[];
  popular?: boolean;
}> = [
  {
    type: 'general',
    title: 'General Queue',
    price: BUILD_SUBMISSION_PRICES.general.priceUsd,
    timeline: BUILD_SUBMISSION_PRICES.general.estimatedDays,
    description: 'Our developers will build your app into a fully working product.',
    icon: Clock,
    features: [
      'Full working application',
      'Responsive design',
      'Clean, maintainable code',
      'Basic deployment setup',
    ],
  },
  {
    type: 'priority',
    title: 'Priority Queue',
    price: BUILD_SUBMISSION_PRICES.priority.priceUsd,
    timeline: `Guaranteed within ${BUILD_SUBMISSION_PRICES.priority.estimatedDays}`,
    description: 'Jump the queue with priority handling from our senior developers.',
    icon: Zap,
    features: [
      'Everything in General',
      'Priority handling',
      'Senior developer assigned',
      'Direct communication channel',
    ],
    popular: true,
  },
];

export function SubmitToDevModal({
  isOpen,
  onClose,
  projectId,
  projectName,
}: SubmitToDevModalProps) {
  const [selectedQueue, setSelectedQueue] = useState<QueueType>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Call backend API to create Stripe checkout session
      // const response = await api.post('/submissions/create-checkout', {
      //   projectId,
      //   queueType: selectedQueue,
      // });
      // window.location.href = response.data.data.url;
      console.log('Submit to dev:', { projectId, queueType: selectedQueue });
    } catch (error) {
      console.error('Failed to create submission checkout:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Submit to Dev</h2>
            <p className="text-sm text-surface-400 mt-1">
              Get <span className="text-white font-medium">{projectName}</span> built into a working product
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Queue options */}
        <div className="grid grid-cols-2 gap-4">
          {queueOptions.map((option) => {
            const isSelected = selectedQueue === option.type;
            return (
              <button
                key={option.type}
                onClick={() => setSelectedQueue(option.type)}
                className={cn(
                  'relative flex flex-col rounded-xl border-2 p-4 text-left transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                )}
              >
                {option.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">
                    Recommended
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-primary-500/20' : 'bg-surface-700'
                  )}>
                    <option.icon className={cn(
                      'w-4 h-4',
                      isSelected ? 'text-primary-400' : 'text-surface-400'
                    )} />
                  </div>
                  <span className="font-semibold text-white">{option.title}</span>
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-bold text-white">${option.price}</span>
                  <span className="text-surface-400 text-sm ml-1">one-time</span>
                </div>

                <div className="flex items-center gap-1.5 mb-3 text-sm text-surface-300">
                  <Clock className="w-3.5 h-3.5" />
                  {option.timeline}
                </div>

                <p className="text-sm text-surface-400 mb-4">{option.description}</p>

                <ul className="space-y-2 mt-auto">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-surface-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold hover:from-primary-400 hover:to-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Submit for ${queueOptions.find(o => o.type === selectedQueue)?.price}
            </>
          )}
        </button>

        <p className="text-xs text-surface-500 text-center">
          You'll be redirected to Stripe for secure payment. Our 2 fullstack developers will start building your app after payment.
        </p>
      </div>
    </Modal>
  );
}
