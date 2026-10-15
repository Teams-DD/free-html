import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PendingConfirmation extends ConfirmationOptions {
  resolve: (confirmed: boolean) => void;
}

interface Props {
  children: React.ReactNode;
}

const ConfirmationContext = createContext<((options: ConfirmationOptions) => Promise<boolean>) | null>(null);

export const AdminConfirmationProvider: React.FC<Props> = ({ children }) => {
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const pendingConfirmation = useRef<PendingConfirmation | null>(null);

  const requestConfirmation = useCallback((options: ConfirmationOptions) => {
    return new Promise<boolean>((resolve) => {
      const nextConfirmation = { ...options, resolve };
      pendingConfirmation.current = nextConfirmation;
      setConfirmation(nextConfirmation);
    });
  }, []);

  const settleConfirmation = useCallback((confirmed: boolean) => {
    const pending = pendingConfirmation.current;
    if (!pending) return;

    pendingConfirmation.current = null;
    setConfirmation(null);
    pending.resolve(confirmed);
  }, []);

  useEffect(() => {
    if (!confirmation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settleConfirmation(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation, settleConfirmation]);

  return (
    <ConfirmationContext.Provider value={requestConfirmation}>
      {children}
      {confirmation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) settleConfirmation(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirmation-title"
            aria-describedby="admin-confirmation-message"
            className="w-full max-w-sm overflow-hidden rounded-md border border-[#2a2c34] bg-[#121317] shadow-2xl"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-rose-950/40 text-rose-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 id="admin-confirmation-title" className="text-sm font-semibold text-zinc-100">
                  {confirmation.title}
                </h2>
                <p id="admin-confirmation-message" className="mt-1.5 text-xs leading-5 text-zinc-400">
                  {confirmation.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#22242b] bg-[#0f1013] px-4 py-3">
              <button
                type="button"
                autoFocus
                onClick={() => settleConfirmation(false)}
                className="rounded border border-[#2a2c34] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-[#1a1b22]"
              >
                {confirmation.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => settleConfirmation(true)}
                className="rounded border border-rose-800/60 bg-rose-950/50 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-900/60"
              >
                {confirmation.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};

export const useAdminConfirmation = () => {
  const requestConfirmation = useContext(ConfirmationContext);
  if (!requestConfirmation) {
    throw new Error('useAdminConfirmation must be used within AdminConfirmationProvider');
  }
  return requestConfirmation;
};