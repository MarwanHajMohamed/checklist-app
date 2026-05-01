import { useState } from 'react';
import { getTemplate, totalItems, flatIndex } from '../data/templates';
import type { ChecklistInstance } from '../types';

interface Props {
  instance: ChecklistInstance;
  onToggle: (index: number) => void;
  onReset: () => void;
  onDelete: () => void;
}

export default function ChecklistView({ instance, onToggle, onReset, onDelete }: Props) {
  const [showDeleteBar, setShowDeleteBar] = useState(false);
  const template = getTemplate(instance.templateId);
  if (!template) return <div className="empty-state visible"><h2>Template not found</h2></div>;

  const total = totalItems(instance.templateId);
  const done = instance.doneItems.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="checklist-view active">
      <div className={`delete-bar${showDeleteBar ? ' visible' : ''}`}>
        <span className="delete-bar-text">
          Delete checklist "{instance.invoiceNum}"? This cannot be undone.
        </span>
        <div className="delete-bar-actions">
          <button className="btn-cancel" onClick={() => setShowDeleteBar(false)}>Cancel</button>
          <button className="btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="view-header">
        <p className="view-tag">{template.tag}</p>
        <h1 dangerouslySetInnerHTML={{ __html: template.titleHtml }} />
        <div className="invoice-num">
          Invoice / ref: <span>{instance.invoiceNum}</span>
        </div>
        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-label">
            {done} / {total}
          </span>
        </div>
      </div>

      {template.sections.map((section, si) => {
        const secItems = section.items;
        const secDone = secItems.filter((_, ii) =>
          instance.doneItems.includes(flatIndex(instance.templateId, si, ii))
        ).length;

        return (
          <div key={si} className="card">
            <div className="section-header">
              <span className="section-num">{String(si + 1).padStart(2, '0')}</span>
              <span className="section-title">{section.title}</span>
              <span className="section-count">
                {secDone} / {secItems.length}
              </span>
            </div>

            {secItems.map((item, ii) => {
              const idx = flatIndex(instance.templateId, si, ii);
              const isDone = instance.doneItems.includes(idx);
              return (
                <div
                  key={ii}
                  className={`item${isDone ? ' done' : ''}`}
                  onClick={() => onToggle(idx)}
                >
                  <div className="cb">
                    <svg width="10" height="10" viewBox="0 0 10 10" className="tick">
                      <path
                        d="M1.5 5l2.5 2.5 4.5-4.5"
                        stroke="white"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="item-text"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                    {item.note && <div className="item-note">{item.note}</div>}
                    {item.warning && <div className="warning-note">{item.warning}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="view-footer">
        <span className={`complete-msg${done === total ? ' visible' : ''}`}>All steps complete.</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="reset-btn" onClick={onReset}>Reset</button>
          <button className="reset-btn" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={() => setShowDeleteBar(true)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
