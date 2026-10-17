import React from 'react';

interface EditConfirmationDialogProps {
  open: boolean;
  processing: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EditConfirmationDialog: React.FC<EditConfirmationDialogProps> = ({
  open,
  processing,
  error,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-confirmation-title"
        className="w-full max-w-sm border border-zinc-700 bg-[#121317] p-4 text-zinc-200 shadow-xl"
      >
        <h2 id="editor-confirmation-title" className="text-sm font-semibold">
          {processing ? 'HTML processing for you...' : 'Hello here! Do you want to edit this HTML?'}
        </h2>
        {processing && (
          <div role="status" aria-live="polite" className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
            Preparing your local HTML copy...
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
        {!processing && (
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              No
            </button>
            <button type="button" onClick={onConfirm} className="bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600">
              Yes
            </button>
          </div>
        )}
      </section>
    </div>
  );
};