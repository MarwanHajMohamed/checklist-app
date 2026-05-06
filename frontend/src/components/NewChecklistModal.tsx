import { useEffect, useRef, useState } from 'react';
import { getTemplate } from '../data/templates';

interface Props {
  exportId: string;
  localId?: string;
  onConfirm: (invoiceNum: string, templateId: string) => void;
  onClose: () => void;
}

export default function NewChecklistModal({ exportId, localId, onConfirm, onClose }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [selectedType, setSelectedType] = useState<'export' | 'local'>('export');
  const inputRef = useRef<HTMLInputElement>(null);

  const chosenId = selectedType === 'export' || !localId ? exportId : localId;
  const template = getTemplate(chosenId);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  function handleConfirm() {
    const trimmed = value.trim();
    if (!trimmed) { setError(true); inputRef.current?.focus(); return; }
    onConfirm(trimmed, chosenId);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New <em>checklist</em></div>
        <div className="modal-sub">{template?.name || 'Creating a new instance'}</div>

        {localId && (
          <div className="modal-type-toggle">
            <button
              className={`modal-type-btn${selectedType === 'export' ? ' active' : ''}`}
              onClick={() => setSelectedType('export')}
            >
              Export
            </button>
            <button
              className={`modal-type-btn${selectedType === 'local' ? ' active' : ''}`}
              onClick={() => setSelectedType('local')}
            >
              Local
            </button>
          </div>
        )}

        <div className="modal-field">
          <label>Invoice / Reference number</label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder="e.g. INV-2024-0042"
            style={{ borderColor: error ? 'var(--accent)' : undefined }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm}>Create</button>
        </div>
      </div>
    </div>
  );
}
