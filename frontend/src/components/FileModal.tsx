import { useRef, useState } from 'react';
import type { AccountantInvoice, AttachedFile } from '../types';
import { uploadFiles, deleteFile, downloadFile } from '../api/accountant';

interface Props {
  invoice: AccountantInvoice;
  onClose: () => void;
  onFilesChanged: (invoiceId: string, files: AttachedFile[]) => void;
}

function fileIcon(mimetype: string) {
  if (mimetype.includes('pdf')) return '📕';
  if (mimetype.includes('image')) return '🖼️';
  if (mimetype.includes('sheet') || mimetype.includes('excel') || mimetype.includes('csv')) return '📊';
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
  return '📄';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export default function FileModal({ invoice, onClose, onFilesChanged }: Props) {
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadFiles(invoice._id, Array.from(files));
      onFilesChanged(invoice._id, result.files);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(fileId: string) {
    await deleteFile(invoice._id, fileId);
    onFilesChanged(invoice._id, invoice.files.filter((f) => f._id !== fileId));
  }

  return (
    <div className="file-modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="file-modal">
        <div className="file-modal-header">
          <div className="file-modal-title">
            Files — <em>{invoice.num}</em>
          </div>
          <button className="file-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="file-modal-body">
          <div
            className={`file-drop-zone${dragover ? ' dragover' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => { e.preventDefault(); setDragover(false); handleAdd(e.dataTransfer.files); }}
          >
            <div className="file-drop-icon">📎</div>
            <div className="file-drop-label">{uploading ? 'Uploading…' : 'Drop files here or click to upload'}</div>
            <div className="file-drop-sub">PDF, images, Excel, Word — any format</div>
            <input
              ref={inputRef}
              type="file"
              className="file-drop-input"
              multiple
              onChange={(e) => handleAdd(e.target.files)}
            />
          </div>

          <div className="file-list">
            {invoice.files.length === 0 ? (
              <div className="file-empty">No files attached yet.</div>
            ) : (
              invoice.files.map((f) => (
                <div key={f._id} className="file-item">
                  <span className="file-icon">{fileIcon(f.mimetype)}</span>
                  <span
                    className="file-name"
                    title={f.originalName}
                    onClick={() => downloadFile(invoice._id, f._id, f.originalName)}
                  >
                    {f.originalName}
                  </span>
                  <span className="file-size">{formatSize(f.size)}</span>
                  <button className="file-remove" onClick={() => handleDelete(f._id)} title="Remove">✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
