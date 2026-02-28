import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  align?: 'left' | 'right';
  className?: string;
}

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -5 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export function Dropdown({
  trigger,
  items,
  onSelect,
  align = 'left',
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectableItems = items.filter((item) => !item.disabled && !item.divider);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1 >= selectableItems.length ? 0 : prev + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 < 0 ? selectableItems.length - 1 : prev - 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && selectableItems[focusedIndex]) {
            onSelect(selectableItems[focusedIndex]);
            setIsOpen(false);
            setFocusedIndex(-1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, selectableItems, focusedIndex, onSelect]
  );

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled || item.divider) return;
    onSelect(item);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block', className)}
      onKeyDown={handleKeyDown}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        tabIndex={0}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            className={cn(
              'absolute z-50 mt-2 min-w-[180px] rounded-lg border border-surface-700 bg-surface-900 py-1 shadow-xl',
              align === 'left' ? 'left-0' : 'right-0'
            )}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
          >
            {items.map((item) => {
              if (item.divider) {
                return <div key={item.id} className="my-1 border-t border-surface-700" />;
              }

              const selectableIndex = selectableItems.findIndex((i) => i.id === item.id);
              const isFocused = selectableIndex === focusedIndex;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                    item.disabled
                      ? 'cursor-not-allowed text-gray-500'
                      : isFocused
                      ? 'bg-surface-800 text-white'
                      : 'text-gray-300 hover:bg-surface-800 hover:text-white'
                  )}
                  onClick={() => handleItemClick(item)}
                  role="option"
                  aria-selected={isFocused}
                  aria-disabled={item.disabled}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
