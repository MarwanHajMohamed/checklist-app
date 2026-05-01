import { useRef, useState } from 'react';
import type { AccountantInvoice, AttachedFile, SendListItem } from '../types';
import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  reorderInvoices,
} from '../api/accountant';
import {
  addSendItem,
  updateSendItem,
  deleteSendItem,
  clearDoneSendItems,
  reorderSendList,
} from '../api/sendList';
import FileModal from './FileModal';

interface Props {
  invoices: AccountantInvoice[];
  sendList: SendListItem[];
  onInvoicesChange: (invoices: AccountantInvoice[]) => void;
  onSendListChange: (items: SendListItem[]) => void;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text: string, query: string) {
  if (!query) return escapeHtml(text);
  const re = new RegExp(`(${escapeRegExp(escapeHtml(query))})`, 'gi');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export default function AccountantView({ invoices, sendList, onInvoicesChange, onSendListChange }: Props) {
  const [newInvNum, setNewInvNum] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fileModalInv, setFileModalInv] = useState<AccountantInvoice | null>(null);

  // Send list
  const [sendInput, setSendInput] = useState('');

  // Drag state (accountant table)
  const dragSrcRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; above: boolean } | null>(null);

  // Drag state (send list)
  const sendDragSrcRef = useRef<string | null>(null);
  const [sendDropTarget, setSendDropTarget] = useState<{ id: string; above: boolean } | null>(null);

  const q = searchQ.toLowerCase();
  const filtered = invoices.filter((inv) => {
    const matchFilter = filter === 'sent' ? inv.sent : filter === 'pending' ? !inv.sent : true;
    const matchSearch = !q || inv.num.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  const sorted =
    filter === 'all'
      ? [...filtered].sort((a, b) => (a.sent === b.sent ? a.order - b.order : a.sent ? 1 : -1))
      : [...filtered].sort((a, b) => a.order - b.order);

  const sentCount = invoices.filter((i) => i.sent).length;
  const pendingCount = invoices.filter((i) => !i.sent).length;

  async function handleAdd() {
    const num = newInvNum.trim();
    if (!num) return;
    const inv = await createInvoice(num);
    onInvoicesChange([...invoices, inv]);
    setNewInvNum('');
  }

  async function handleToggleSent(id: string) {
    const inv = invoices.find((i) => i._id === id);
    if (!inv) return;
    const updated = await updateInvoice(id, { sent: !inv.sent });
    onInvoicesChange(invoices.map((i) => (i._id === id ? { ...i, sent: updated.sent } : i)));
  }

  async function handleDelete(id: string) {
    await deleteInvoice(id);
    onInvoicesChange(invoices.filter((i) => i._id !== id));
  }

  async function handleClearSent() {
    const kept = invoices.filter((i) => !i.sent);
    await Promise.all(invoices.filter((i) => i.sent).map((i) => deleteInvoice(i._id)));
    onInvoicesChange(kept);
  }

  function startEdit(id: string, currentNum: string) {
    setEditingId(id);
    setEditValue(currentNum);
  }

  async function commitEdit() {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      const updated = await updateInvoice(editingId, { num: trimmed });
      onInvoicesChange(invoices.map((i) => (i._id === editingId ? { ...i, num: updated.num } : i)));
    }
    setEditingId(null);
  }

  // ── Drag / drop (accountant table) ──
  function handleDragStart(id: string) {
    dragSrcRef.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropTarget({ id, above: e.clientY < rect.top + rect.height / 2 });
  }

  async function handleDrop(targetId: string, above: boolean) {
    const srcId = dragSrcRef.current;
    if (!srcId || srcId === targetId) { setDropTarget(null); return; }
    const arr = [...invoices];
    const si = arr.findIndex((i) => i._id === srcId);
    const ti = arr.findIndex((i) => i._id === targetId);
    const [item] = arr.splice(si, 1);
    const nti = arr.findIndex((i) => i._id === targetId);
    arr.splice(above ? nti : nti + 1, 0, item);
    const reordered = arr.map((inv, idx) => ({ ...inv, order: idx }));
    onInvoicesChange(reordered);
    setDropTarget(null);
    dragSrcRef.current = null;
    await reorderInvoices(reordered.map((i) => ({ id: i._id })));
  }

  // ── Send list actions ──
  async function handleAddSend() {
    const num = sendInput.trim();
    if (!num) return;
    const item = await addSendItem(num);
    onSendListChange([...sendList, item]);
    setSendInput('');
  }

  async function handleToggleSendDone(id: string) {
    const item = sendList.find((i) => i._id === id);
    if (!item) return;
    const updated = await updateSendItem(id, { done: !item.done });
    onSendListChange(sendList.map((i) => (i._id === id ? updated : i)));
  }

  async function handleRemoveSend(id: string) {
    await deleteSendItem(id);
    onSendListChange(sendList.filter((i) => i._id !== id));
  }

  async function handleClearDoneSend() {
    await clearDoneSendItems();
    onSendListChange(sendList.filter((i) => !i.done));
  }

  function handleSendDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSendDropTarget({ id, above: e.clientY < rect.top + rect.height / 2 });
  }

  async function handleSendDrop(targetId: string, above: boolean) {
    const srcId = sendDragSrcRef.current;
    if (!srcId || srcId === targetId) { setSendDropTarget(null); return; }
    const arr = [...sendList];
    const si = arr.findIndex((i) => i._id === srcId);
    const ti = arr.findIndex((i) => i._id === targetId);
    const [item] = arr.splice(si, 1);
    const nti = arr.findIndex((i) => i._id === targetId);
    arr.splice(above ? nti : nti + 1, 0, item);
    onSendListChange(arr);
    setSendDropTarget(null);
    sendDragSrcRef.current = null;
    await reorderSendList(arr.map((i) => ({ id: i._id })));
  }

  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const sendDoneCount = sendList.filter((i) => i.done).length;

  return (
    <div className="accountant-view active">
      <div className="view-header">
        <p className="view-tag blue">Finance</p>
        <h1>Sent to <em className="blue">accountant</em></h1>
        <p className="invoice-num" style={{ marginBottom: 0 }}>Track which invoices have been forwarded.</p>
      </div>

      <div className="acct-layout">
        {/* LEFT */}
        <div className="acct-left">
          <div className="acct-add-row">
            <input
              className="acct-input"
              value={newInvNum}
              onChange={(e) => setNewInvNum(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Invoice / reference number…"
              autoComplete="off"
            />
            <button className="acct-add-btn" onClick={handleAdd}>Add</button>
          </div>

          <div className="acct-search-row">
            <div className={`acct-search-wrap${searchQ ? ' has-query' : ''}`}>
              <span className="acct-search-icon">⌕</span>
              <input
                className="acct-search-input"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchQ('')}
                placeholder="Filter invoices…"
                autoComplete="off"
              />
              {searchQ && (
                <button className="acct-search-clear" onClick={() => setSearchQ('')}>✕</button>
              )}
            </div>
          </div>

          <div className="acct-filters">
            {(['all', 'pending', 'sent'] as const).map((f) => (
              <button
                key={f}
                className={`acct-filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="acct-table-wrap">
            <div className="acct-table-header">
              <span className="acct-th" />
              <span className="acct-th">Invoice / Ref</span>
              <span className="acct-th" style={{ textAlign: 'center', minWidth: 90 }}>Sent to accountant</span>
              <span className="acct-th" style={{ textAlign: 'center', minWidth: 70 }}>Files</span>
              <span className="acct-th" style={{ minWidth: 36 }} />
            </div>

            <div id="acct-rows">
              {sorted.length === 0 ? (
                <div className="acct-empty">
                  {searchQ ? `No results for "${searchQ}"` : filter === 'all' ? 'No invoices yet — add one above.' : 'Nothing here.'}
                </div>
              ) : (
                sorted.map((inv) => {
                  const isDrop = dropTarget?.id === inv._id;
                  return (
                    <div
                      key={inv._id}
                      className={`acct-row${inv.sent ? ' sent' : ''}${isDrop && dropTarget?.above ? ' drop-above' : ''}${isDrop && !dropTarget?.above ? ' drop-below' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(inv._id)}
                      onDragOver={(e) => handleDragOver(e, inv._id)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={() => dropTarget && handleDrop(inv._id, dropTarget.above)}
                      onDragEnd={() => { setDropTarget(null); dragSrcRef.current = null; }}
                    >
                      <div className="acct-drag-handle" title="Drag to reorder">
                        <span /><span /><span />
                      </div>

                      {editingId === inv._id ? (
                        <input
                          className="acct-inv-edit"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                            if (e.key === 'Escape') { setEditingId(null); }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="acct-inv-num"
                          onClick={() => startEdit(inv._id, inv.num)}
                          dangerouslySetInnerHTML={{ __html: highlight(inv.num, searchQ) }}
                        />
                      )}

                      <div className="acct-sent-toggle" onClick={() => handleToggleSent(inv._id)}>
                        <div className="acct-cb">
                          {inv.sent && (
                            <svg width="9" height="9" viewBox="0 0 10 10" style={{ stroke: 'white', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                            </svg>
                          )}
                        </div>
                        <span className="acct-cb-label">{inv.sent ? 'Sent' : 'Pending'}</span>
                      </div>

                      <div className="acct-file-cell">
                        <button
                          className={`acct-file-btn${inv.files.length > 0 ? ' has-file' : ''}`}
                          onClick={() => setFileModalInv(inv)}
                          title={inv.files.length > 0 ? `${inv.files.length} file(s) attached` : 'Attach files'}
                        >
                          📎{inv.files.length > 0 && <span className="acct-file-count">{inv.files.length}</span>}
                        </button>
                      </div>

                      <span className="acct-del" onClick={() => handleDelete(inv._id)}>✕</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="acct-summary">
            <span className="acct-stat"><strong>{sentCount}</strong> sent</span>
            <span className="acct-stat"><strong>{pendingCount}</strong> pending</span>
            <button className="acct-clear-btn" onClick={handleClearSent}>Clear sent</button>
          </div>
        </div>

        {/* RIGHT — Send Panel */}
        <div className="send-panel">
          <div className="send-panel-header">
            <div className="send-panel-title">Today's <em>send list</em></div>
            <div className="send-panel-date">{todayLabel}</div>
          </div>

          <div className="send-panel-body">
            <div id="send-list-items">
              {sendList.length === 0 ? (
                <div className="send-panel-empty">Nothing planned yet.<br />Add invoice refs below.</div>
              ) : (
                sendList.map((item) => {
                  const isDrop = sendDropTarget?.id === item._id;
                  return (
                    <div
                      key={item._id}
                      className={`send-item${item.done ? ' done-send' : ''}${isDrop && sendDropTarget?.above ? ' drop-above-send' : ''}${isDrop && !sendDropTarget?.above ? ' drop-below-send' : ''}`}
                      draggable
                      onDragStart={() => { sendDragSrcRef.current = item._id; }}
                      onDragOver={(e) => handleSendDragOver(e, item._id)}
                      onDragLeave={() => setSendDropTarget(null)}
                      onDrop={() => sendDropTarget && handleSendDrop(item._id, sendDropTarget.above)}
                      onDragEnd={() => { setSendDropTarget(null); sendDragSrcRef.current = null; }}
                    >
                      <div className="send-item-drag"><span /><span /><span /></div>
                      <span className="send-item-num">{item.num}</span>
                      <div className="send-item-done-cb" onClick={() => handleToggleSendDone(item._id)}>
                        {item.done && (
                          <svg width="8" height="8" viewBox="0 0 10 10" style={{ stroke: 'white', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                          </svg>
                        )}
                      </div>
                      <button className="send-item-remove" onClick={() => handleRemoveSend(item._id)}>✕</button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="send-panel-add">
              <input
                className="send-panel-input"
                value={sendInput}
                onChange={(e) => setSendInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSend()}
                placeholder="Add invoice ref…"
                autoComplete="off"
              />
              <button className="send-panel-add-btn" onClick={handleAddSend}>Add</button>
            </div>
          </div>

          <div className="send-panel-footer">
            <span className="send-panel-stat">
              <strong>{sendDoneCount}</strong> / <span>{sendList.length}</span> sent today
            </span>
            <button className="send-clear-btn" onClick={handleClearDoneSend}>Clear done</button>
          </div>
        </div>
      </div>

      {fileModalInv && (
        <FileModal
          invoice={fileModalInv}
          onClose={() => setFileModalInv(null)}
          onFilesChanged={(invId, files) => {
            const updated = invoices.map((i) => i._id === invId ? { ...i, files } : i);
            onInvoicesChange(updated);
            setFileModalInv((prev) => prev && prev._id === invId ? { ...prev, files } : prev);
          }}
        />
      )}
    </div>
  );
}
