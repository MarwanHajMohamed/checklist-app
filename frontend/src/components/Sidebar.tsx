import { useState } from "react";
import { getTemplate, totalItems } from "../data/templates";
import type { ChecklistInstance, AccountantInvoice } from "../types";

interface Props {
  instances: ChecklistInstance[];
  accountantInvoices: AccountantInvoice[];
  currentId: string | null;
  role: "operations" | "accountant";
  onSelect: (id: string) => void;
  onSelectAccountant: () => void;
  onSelectLogicall: () => void;
  onAdd: (exportId: string, localId?: string) => void;
  onDelete: (instanceId: string) => void;
  onLogout: () => void;
}

const DOC_PAIRS = [
  { label: "Invoice", exportId: "export-invoice", localId: "local-invoice" },
  { label: "COO", exportId: "coo", localId: null },
  { label: "Shipping details folder", exportId: "shipping-export", localId: "shipping-local" },
  { label: "Shipment audit trail", exportId: "audit-trail", localId: "audit-trail-local" },
] as const;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const re = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return text.replace(re, "<mark>$1</mark>");
}

export default function Sidebar({
  instances,
  accountantInvoices,
  currentId,
  role,
  onSelect,
  onSelectAccountant,
  onSelectLogicall,
  onAdd,
  onDelete,
  onLogout,
}: Props) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const q = search.trim().toLowerCase();
  const checklistMatches = q
    ? instances.filter((i) => i.invoiceNum.toLowerCase().includes(q))
    : [];
  const acctMatches = q
    ? accountantInvoices.filter((i) => i.num.toLowerCase().includes(q))
    : [];
  const isSearching = q.length > 0;

  const sentCount = accountantInvoices.filter((i) => i.sent).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p className="brand-tag">Process hub</p>
        <h2 className="brand-title">
          My <em>checklists</em>
        </h2>
      </div>

      <div className={`sidebar-search${search ? " has-query" : ""}`}>
        <span className="search-icon">⌕</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoices…"
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")}>
            ✕
          </button>
        )}
      </div>

      {isSearching ? (
        <div className="search-results visible">
          {role === "operations" && checklistMatches.length > 0 && (
            <>
              <div className="search-results-label">Checklists</div>
              {checklistMatches.map((inst) => {
                const t = getTemplate(inst.templateId);
                const total = totalItems(inst.templateId);
                return (
                  <div
                    key={inst._id}
                    className={`search-result-item${currentId === inst._id ? " active" : ""}`}
                    onClick={() => {
                      setSearch("");
                      onSelect(inst._id);
                    }}
                  >
                    <div
                      className="search-result-num"
                      dangerouslySetInnerHTML={{
                        __html: highlight(inst.invoiceNum, search.trim()),
                      }}
                    />
                    <div className="search-result-meta">
                      {t?.name} · {inst.doneItems.length}/{total} done
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {acctMatches.length > 0 && (
            <>
              <div className="search-results-label">Accountant</div>
              {acctMatches.map((inv) => (
                <div
                  key={inv._id}
                  className={`search-result-item${currentId === "accountant" ? " active" : ""}`}
                  onClick={() => {
                    setSearch("");
                    onSelectAccountant();
                  }}
                >
                  <div
                    className="search-result-num"
                    dangerouslySetInnerHTML={{
                      __html: highlight(inv.num, search.trim()),
                    }}
                  />
                  <div className="search-result-meta">
                    {inv.sent ? "Sent to accountant" : "Pending"}
                  </div>
                </div>
              ))}
            </>
          )}
          {(role === "operations" ? checklistMatches.length === 0 : true) &&
            acctMatches.length === 0 && (
              <div className="search-no-results">
                No results for "{search.trim()}"
              </div>
            )}
        </div>
      ) : (
        <>
          {role === "operations" && (
            <div className="nav-group">
              <div className="nav-group-header">
                <span className="nav-group-label">Documents</span>
              </div>

              {DOC_PAIRS.map((pair) => {
                const templateIds: string[] = pair.localId
                  ? [pair.exportId, pair.localId]
                  : [pair.exportId];
                const pairInstances = instances.filter((i) =>
                  templateIds.includes(i.templateId),
                );
                const isOpen = pairInstances.length > 0 && !collapsed[pair.label];

                return (
                  <div
                    key={pair.label}
                    className={`template-block${isOpen ? " open" : ""}`}
                  >
                    <div className="template-label-row">
                      <div
                        className="template-label"
                        onClick={() =>
                          pairInstances.length > 0 && toggleCollapse(pair.label)
                        }
                      >
                        <span
                          className="template-chevron"
                          style={{ opacity: pairInstances.length > 0 ? 1 : 0 }}
                        >
                          ▶
                        </span>
                        {pair.label}
                      </div>

                      <button
                        className="nav-group-add"
                        onClick={() => onAdd(pair.exportId, pair.localId ?? undefined)}
                        title="New checklist"
                      >
                        +
                      </button>
                    </div>

                    <div className="instance-list">
                      {pairInstances.map((inst) => {
                        const total = totalItems(inst.templateId);
                        const done = inst.doneItems.length;
                        const isComplete = done === total;
                        const isExport = inst.templateId === pair.exportId;
                        return (
                          <div
                            key={inst._id}
                            className={`nav-item${currentId === inst._id ? " active" : ""}`}
                            onClick={() => onSelect(inst._id)}
                          >
                            <div className="nav-label" title={inst.invoiceNum}>
                              <span
                                className={`nav-type-tag${isExport ? " export" : " local"}`}
                              >
                                {isExport ? "EXP" : "LOC"}
                              </span>
                              <span>{inst.invoiceNum}</span>
                              {isComplete && (
                                <span className="complete-tag">Complete</span>
                              )}
                            </div>
                            <span className="nav-badge">
                              {done}/{total}
                            </span>
                            <span
                              className="nav-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(inst._id);
                              }}
                            >
                              ✕
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="nav-group">
            <div className="nav-group-header">
              <span className="nav-group-label">Finance</span>
            </div>
            <div
              className={`nav-item-accountant${currentId === "accountant" ? " active" : ""}`}
              onClick={onSelectAccountant}
            >
              <div className="nav-label" style={{ fontSize: 11 }}>
                Sent to accountant
              </div>
              <span className="nav-badge">
                {sentCount}/{accountantInvoices.length}
              </span>
            </div>
          </div>

          {role === "operations" && (
            <div className="nav-group">
              <div className="nav-group-header">
                <span className="nav-group-label">Logistics</span>
              </div>
              <div
                className={`nav-item-logicall${currentId === "logicall" ? " active" : ""}`}
                onClick={onSelectLogicall}
              >
                <div className="nav-label" style={{ fontSize: 11 }}>
                  Logicall booking
                </div>
                <span className="nav-badge-new">New</span>
              </div>
            </div>
          )}
        </>
      )}

      <div
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border)",
          padding: "0.75rem 1.5rem",
        }}
      >
        <button
          className="btn-ghost"
          style={{ width: "100%", fontSize: 11 }}
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
