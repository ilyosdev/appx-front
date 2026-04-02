import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw, Loader2, AlertCircle, Rocket, ArrowUpRight, Settings, CheckCircle2, Moon, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeploymentStatus } from '@/stores/deployStore';

interface DeviceTestingSidebarProps {
  projectId: string;
  expoUrl: string | null;
  webUrl: string | null;
  status: DeploymentStatus;
  errorMessage?: string;
  onProvision: () => void;
  onWake?: () => void;
  connectedDevice?: string | null;
  containerCount?: number;
  maxContainers?: number;
  alwaysOn?: boolean;
  onToggleAlwaysOn?: (enabled: boolean) => void;
  isPaidPlan?: boolean;
  onOpenSettings?: () => void;
  onScale?: (instances: 0 | 1) => void;
  desiredInstances?: number;
  actualInstances?: number;
}

export function DeviceTestingSidebar({
  projectId,
  expoUrl,
  status,
  errorMessage,
  onProvision,
  onWake,
  connectedDevice,
  containerCount,
  maxContainers,
  alwaysOn,
  onToggleAlwaysOn,
  isPaidPlan,
  onOpenSettings,
  onScale,
  desiredInstances: _desiredInstances,
  actualInstances: _actualInstances,
}: DeviceTestingSidebarProps) {
  const isTransient =
    status === 'provisioning' || status === 'warm' || status === 'deploying';
  const isIdle = status === 'none' || status === 'destroyed';
  const isSleeping = status === 'sleeping';
  const isError = status === 'error';
  const isRunning = status === 'running';
  const isLimitReached = errorMessage?.toLowerCase().includes('limit') && containerCount != null && maxContainers != null && containerCount >= maxContainers;

  return (
    <div className="w-[240px] flex-shrink-0 flex flex-col bg-surface-950 border-l border-surface-800 overflow-hidden">
      {/* Header */}
      <div className="flex-none px-4 pt-4 pb-3 border-b border-surface-800/60">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-surface-400" />
          <span className="text-xs font-semibold text-surface-200 tracking-wide uppercase">
            Device Testing
          </span>
          {/* Status dot */}
          <div className={cn(
            'ml-auto w-2 h-2 rounded-full',
            isRunning && 'bg-emerald-400',
            isTransient && 'bg-yellow-400 animate-pulse',
            isError && 'bg-red-400',
            (isIdle || isSleeping) && 'bg-surface-600',
          )} />
        </div>
      </div>

      {/* Container usage indicator */}
      {containerCount != null && maxContainers != null && (
        <div className="flex-none px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-surface-500">
              {containerCount}/{maxContainers} containers used
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-surface-800 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                containerCount >= maxContainers ? 'bg-red-400' :
                containerCount >= maxContainers * 0.8 ? 'bg-yellow-400' :
                'bg-primary-500'
              )}
              style={{ width: `${Math.min((containerCount / maxContainers) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4 overflow-y-auto">
        {/* State: idle / no container */}
        {isIdle && <IdleState onProvision={onProvision} />}

        {/* State: sleeping — show Start Server */}
        {isSleeping && <SleepingState onWake={onWake || onProvision} onScale={onScale} />}

        {/* State: provisioning / warm / deploying — show progress steps */}
        {isTransient && <TransientState status={status} />}

        {/* State: error */}
        {isError && (
          isLimitReached ? (
            <LimitReachedState
              containerCount={containerCount!}
              maxContainers={maxContainers!}
              onOpenSettings={onOpenSettings}
            />
          ) : (
            <ErrorState errorMessage={errorMessage} onRetry={onProvision} />
          )
        )}

        {/* State: running */}
        {isRunning && expoUrl && (
          <RunningState
            projectId={projectId}
            expoUrl={expoUrl}
            connectedDevice={connectedDevice}
            alwaysOn={alwaysOn}
            onToggleAlwaysOn={onToggleAlwaysOn}
            isPaidPlan={isPaidPlan}
            onScale={onScale}
          />
        )}

        {/* State: running but no URL yet */}
        {isRunning && !expoUrl && <NoUrlState />}
      </div>
    </div>
  );
}

// --- Sub-states ---

function IdleState({ onProvision }: { onProvision: () => void }) {
  return (
    <div className="w-full flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-center">
        <Smartphone className="w-6 h-6 text-surface-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-surface-200">Test on your phone</p>
        <p className="text-xs text-surface-500 leading-relaxed">
          Deploy to get a live QR code you can scan with Expo Go.
        </p>
      </div>
      <button
        onClick={onProvision}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
      >
        <Rocket className="w-3.5 h-3.5" />
        Deploy to test on device
      </button>
    </div>
  );
}

function SleepingState({ onWake, onScale }: { onWake: () => void; onScale?: (instances: 0 | 1) => void }) {
  return (
    <div className="w-full flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-center">
        <Moon className="w-6 h-6 text-surface-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-surface-200">Container sleeping</p>
        <p className="text-xs text-surface-500 leading-relaxed">
          Your container went to sleep after inactivity. Start it to resume testing.
        </p>
      </div>

      {/* Instance state indicator */}
      <InstanceStateChip state="sleeping" />

      <button
        onClick={() => { onScale ? onScale(1) : onWake(); }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
        Wake Up
      </button>
    </div>
  );
}

const DEPLOY_STEPS = [
  { key: 'provisioning', label: 'Provisioning container' },
  { key: 'warm', label: 'Starting bundle server' },
  { key: 'deploying', label: 'Pushing code to container' },
] as const;

function TransientState({ status }: { status: DeploymentStatus }) {
  const currentIdx = DEPLOY_STEPS.findIndex(s => s.key === status);

  return (
    <div className="w-full flex flex-col items-center gap-4 text-center">
      <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
      <div className="w-full space-y-2">
        {DEPLOY_STEPS.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all',
                isDone && 'text-emerald-400',
                isCurrent && 'text-primary-300 bg-primary-500/10',
                !isDone && !isCurrent && 'text-surface-600',
              )}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
              ) : (
                <div className="w-3.5 h-3.5 flex-shrink-0 rounded-full border border-surface-700" />
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-surface-500">Usually takes 30–60 seconds</p>
    </div>
  );
}

function ErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage?: string;
  onRetry: () => void;
}) {
  const isSyncError = errorMessage?.toLowerCase().includes('sync failed') || errorMessage?.toLowerCase().includes('push failed');

  return (
    <div className="w-full flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-400" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-surface-200">
          {isSyncError ? 'Code sync failed' : 'Deployment failed'}
        </p>
        {errorMessage && (
          <p className="text-xs text-surface-500 leading-relaxed break-words max-w-full">
            {errorMessage}
          </p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-medium transition-colors border border-surface-700"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {isSyncError ? 'Force Re-sync' : 'Retry'}
      </button>
    </div>
  );
}

function LimitReachedState({
  containerCount,
  maxContainers,
  onOpenSettings,
}: {
  containerCount: number;
  maxContainers: number;
  onOpenSettings?: () => void;
}) {
  return (
    <div className="w-full flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-yellow-400" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-surface-200">Container limit reached</p>
        <p className="text-xs text-surface-500">
          {containerCount}/{maxContainers} containers in use
        </p>
      </div>
      <a
        href="/pricing"
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
        Upgrade Plan
      </a>
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
        >
          <Settings className="w-3 h-3" />
          Manage Containers
        </button>
      )}
    </div>
  );
}

function RunningState({
  projectId,
  expoUrl: _expoUrl,
  connectedDevice,
  alwaysOn,
  onToggleAlwaysOn,
  isPaidPlan,
  onScale,
}: {
  projectId: string;
  expoUrl: string;
  connectedDevice?: string | null;
  alwaysOn?: boolean;
  onToggleAlwaysOn?: (enabled: boolean) => void;
  isPaidPlan?: boolean;
  onScale?: (instances: 0 | 1) => void;
}) {
  const [sleepConfirm, setSleepConfirm] = useState(false);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Header */}
      <div className="text-center space-y-0.5">
        <p className="text-xs font-semibold text-surface-200">Test on your phone</p>
        <p className="text-[11px] text-surface-500">Scan with Expo Go</p>
      </div>

      {/* QR code */}
      <div className="p-2.5 rounded-xl bg-white shadow-lg">
        <QRCodeSVG value={`${window.location.origin}/preview/${projectId}`} size={140} level="M" />
      </div>

      {/* Instance control — compact toggle */}
      {onScale && (
        <div className="w-full rounded-lg bg-surface-900 border border-surface-800 px-3 py-2">
          <div className="flex items-center justify-between">
            <InstanceStateChip state="running" />
            {!sleepConfirm ? (
              <button
                onClick={() => setSleepConfirm(true)}
                className="flex items-center gap-1 text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
              >
                <Moon className="w-3 h-3" />
                Sleep
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { onScale(0); setSleepConfirm(false); }}
                  className="text-[10px] text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setSleepConfirm(false)}
                  className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Always-on toggle (paid plans only) */}
      {isPaidPlan && onToggleAlwaysOn && (
        <div className="w-full flex items-center justify-between px-1">
          <span className="text-[11px] text-surface-400">Keep alive (5 cr/day)</span>
          <button
            onClick={() => onToggleAlwaysOn(!alwaysOn)}
            className={cn(
              'relative w-8 h-[18px] rounded-full transition-colors',
              alwaysOn ? 'bg-primary-500' : 'bg-surface-700',
            )}
          >
            <span className={cn(
              'absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform',
              alwaysOn && 'translate-x-[14px]'
            )} />
          </button>
        </div>
      )}

      {/* Instructions */}
      <ol className="w-full space-y-2">
        {[
          'Install Expo Go on your phone',
          'Open your camera app',
          'Scan the QR code above',
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-[9px] font-bold text-surface-400 mt-0.5">
              {i + 1}
            </span>
            <span className="text-[11px] text-surface-400 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      {/* Connected device card */}
      {connectedDevice && (
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[11px] text-emerald-300 font-medium truncate">
            {connectedDevice}
          </span>
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-surface-600 text-center leading-relaxed">
        Some features may behave differently on device vs. browser preview.
      </p>
    </div>
  );
}

function NoUrlState() {
  return (
    <div className="w-full flex flex-col items-center gap-3 text-center">
      <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      <p className="text-xs text-surface-400">Preparing QR code…</p>
    </div>
  );
}

function InstanceStateChip({ state }: { state: 'sleeping' | 'running' | 'starting' }) {
  const config = {
    sleeping: { dot: 'bg-surface-500', text: 'text-surface-400', label: 'Sleeping' },
    running: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Running' },
    starting: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', label: 'Starting...' },
  }[state];

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      <span className={cn('text-[10px] font-medium', config.text)}>{config.label}</span>
    </div>
  );
}
