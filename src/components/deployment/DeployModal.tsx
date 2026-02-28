import { Modal } from '../ui/Modal';
import { DeploymentPanel } from './DeploymentPanel';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  publishedUrl?: string | null;
  onDeploymentComplete?: (url: string) => void;
}

export function DeployModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  publishedUrl,
  onDeploymentComplete,
}: DeployModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deploy to Vercel" size="lg">
      <DeploymentPanel
        projectId={projectId}
        projectName={projectName}
        initialUrl={publishedUrl}
        variant="inline"
        onDeploymentComplete={(url) => {
          onDeploymentComplete?.(url);
        }}
      />
    </Modal>
  );
}
