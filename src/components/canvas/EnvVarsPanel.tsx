import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type EnvVarResponse } from '@/lib/projects';
import { Lock, Unlock, Trash2, Plus, Info, Loader2, Scan, Upload, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui';

interface EnvVarsPanelProps {
  projectId: string;
}

export function EnvVarsPanel({ projectId }: EnvVarsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state for adding new var
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDetected, setShowDetected] = useState(false);

  const { data: envVars = [], isLoading } = useQuery<EnvVarResponse[]>({
    queryKey: ['env-vars', projectId],
    queryFn: () => projectsApi.getEnvVars(projectId),
  });

  const { data: detected, isLoading: isDetecting, refetch: runDetect } = useQuery({
    queryKey: ['env-vars-detect', projectId],
    queryFn: () => projectsApi.detectEnvVars(projectId),
    enabled: showDetected,
  });

  const createMutation = useMutation({
    mutationFn: (dto: { key: string; value: string; isSecret?: boolean }) =>
      projectsApi.createEnvVar(projectId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env-vars', projectId] });
      setNewKey('');
      setNewValue('');
      setNewIsSecret(false);
      setShowAddForm(false);
      toast({ title: 'Variable added', variant: 'success' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to add variable',
        description: err.response?.data?.message || 'Please try again',
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (varId: string) => projectsApi.deleteEnvVar(projectId, varId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['env-vars', projectId] });
      setDeletingId(null);
      toast({ title: 'Variable deleted', variant: 'success' });
    },
    onError: (err: any) => {
      setDeletingId(null);
      toast({
        title: 'Failed to delete variable',
        description: err.response?.data?.message || 'Please try again',
        variant: 'error',
      });
    },
  });

  const pushMutation = useMutation({
    mutationFn: () => projectsApi.pushEnvVars(projectId),
    onSuccess: (data) => {
      toast({ title: `Pushed ${data.pushed} variables to container`, variant: 'success' });
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to push variables',
        description: err.response?.data?.message || 'No running container',
        variant: 'error',
      });
    },
  });

  const handleKeyInput = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setNewKey(sanitized);
  };

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    createMutation.mutate({ key: newKey.trim(), value: newValue, isSecret: newIsSecret });
  };

  const handleDelete = (varId: string) => {
    if (deletingId === varId) {
      deleteMutation.mutate(varId);
    } else {
      setDeletingId(varId);
      setTimeout(() => setDeletingId((prev) => (prev === varId ? null : prev)), 3000);
    }
  };

  const handleAddDetected = (key: string) => {
    setNewKey(key);
    setNewValue('');
    setNewIsSecret(true);
    setShowAddForm(true);
    setShowDetected(false);
  };

  const unconfiguredDetected = detected?.detected.filter(d => !d.configured) || [];
  const suggestions = detected?.suggestions || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-surface-500">
          Encrypted at rest with AES-256-GCM
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setShowDetected(!showDetected); if (!showDetected) runDetect(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            title="Scan code for env vars"
          >
            <Scan className="w-3 h-3" />
            Detect
          </button>
          {envVars.length > 0 && (
            <button
              onClick={() => pushMutation.mutate()}
              disabled={pushMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary-400 hover:text-white hover:bg-primary-500/20 transition-colors disabled:opacity-50"
              title="Push env vars to running container"
            >
              {pushMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Push
            </button>
          )}
        </div>
      </div>

      {/* Detected env vars from code */}
      {showDetected && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
            <Scan className="w-3.5 h-3.5" />
            Detected from code
          </p>
          {isDetecting ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-surface-400" />
              <span className="text-xs text-surface-400">Scanning source files...</span>
            </div>
          ) : unconfiguredDetected.length === 0 && suggestions.length === 0 ? (
            <p className="text-xs text-surface-500">All detected variables are configured.</p>
          ) : (
            <>
              {unconfiguredDetected.map(d => (
                <div key={d.key} className="flex items-center justify-between gap-2 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-surface-300 truncate">{d.key}</span>
                    <span className="text-[10px] text-surface-600 truncate">{d.file}</span>
                  </div>
                  <button
                    onClick={() => handleAddDetected(d.key)}
                    className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    Configure
                  </button>
                </div>
              ))}
              {suggestions.length > 0 && (
                <>
                  <p className="text-xs text-surface-500 pt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Suggestions
                  </p>
                  {suggestions.map(s => (
                    <div key={s.key} className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-surface-400 truncate">{s.key}</span>
                        <span className="text-[10px] text-surface-600">{s.description}</span>
                      </div>
                      <button
                        onClick={() => handleAddDetected(s.key)}
                        className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Var list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-surface-500" />
        </div>
      ) : envVars.length > 0 ? (
        <div className="rounded-lg border border-surface-800 overflow-hidden">
          {envVars.map((envVar) => (
            <div
              key={envVar.id}
              className="flex items-center gap-3 px-3 py-2 border-b border-surface-800/50 last:border-b-0"
            >
              <span className="font-mono text-sm text-surface-300 min-w-0 truncate flex-shrink-0 max-w-[140px]">
                {envVar.key}
              </span>
              <span className="font-mono text-sm text-surface-500 flex-1 truncate">
                {envVar.value}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {envVar.isSecret ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-surface-500" />
                )}
                <button
                  onClick={() => handleDelete(envVar.id)}
                  disabled={deleteMutation.isPending}
                  className={cn(
                    'p-1 rounded transition-colors',
                    deletingId === envVar.id
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-surface-600 hover:text-red-400',
                  )}
                  title={deletingId === envVar.id ? 'Click again to confirm' : 'Delete variable'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add variable form */}
      {showAddForm ? (
        <div className="bg-surface-800/30 rounded-lg p-3 space-y-2.5">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Key</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => handleKeyInput(e.target.value)}
              placeholder="MY_API_KEY"
              className="w-full px-2.5 py-1.5 rounded-md bg-surface-800 border border-surface-700 text-surface-200 text-sm font-mono placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1">Value</label>
            <input
              type={newIsSecret ? 'password' : 'text'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="value..."
              className="w-full px-2.5 py-1.5 rounded-md bg-surface-800 border border-surface-700 text-surface-200 text-sm font-mono placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newIsSecret}
              onChange={(e) => setNewIsSecret(e.target.checked)}
              className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
            />
            <span className="text-xs text-surface-400">Secret (encrypted, masked in UI)</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewKey('');
                setNewValue('');
                setNewIsSecret(false);
              }}
              className="px-3 py-1.5 text-xs text-surface-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newKey.trim() || !newValue.trim() || createMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Add Variable
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Variable
        </button>
      )}

      {/* Info text */}
      <div className="flex items-start gap-1.5 pt-1">
        <Info className="w-3 h-3 text-surface-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-surface-500">
          Variables are injected into EAS builds and pushed to live containers.
        </p>
      </div>
    </div>
  );
}
