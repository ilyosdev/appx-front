import { useState, useRef, useEffect, type ReactNode, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  value?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, value, onChange, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(value || defaultTab || tabs[0]?.id);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tabListRef = useRef<HTMLDivElement>(null);

  const currentTab = value !== undefined ? value : activeTab;

  useEffect(() => {
    const activeTabElement = tabRefs.current.get(currentTab);
    if (activeTabElement && tabListRef.current) {
      const tabListRect = tabListRef.current.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - tabListRect.left,
        width: tabRect.width,
      });
    }
  }, [currentTab, tabs]);

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.disabled) return;

    if (onChange) {
      onChange(tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === currentTab);

    let newIndex = currentEnabledIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentEnabledIndex - 1;
        if (newIndex < 0) newIndex = enabledTabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentEnabledIndex + 1;
        if (newIndex >= enabledTabs.length) newIndex = 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = enabledTabs[newIndex];
    if (newTab) {
      handleTabChange(newTab.id);
      tabRefs.current.get(newTab.id)?.focus();
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div ref={tabListRef} role="tablist" className="relative flex border-b border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            role="tab"
            aria-selected={currentTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={currentTab === tab.id ? 0 : -1}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
              tab.disabled
                ? 'cursor-not-allowed text-gray-600'
                : currentTab === tab.id
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}

        <motion.div
          className="absolute bottom-0 h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-500"
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>

      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={tab.id}
            hidden={currentTab !== tab.id}
            tabIndex={0}
            className="focus:outline-none"
          >
            {currentTab === tab.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {tab.content}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
