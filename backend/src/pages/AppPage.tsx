import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import ChecklistView from '../components/ChecklistView';
import AccountantView from '../components/AccountantView';
import LogicallView from '../components/LogicallView';
import NewChecklistModal from '../components/NewChecklistModal';
import { useAuth } from '../contexts/AuthContext';
import { fetchChecklists, createChecklist, toggleItem, resetChecklist, deleteChecklist } from '../api/checklists';
import { fetchInvoices } from '../api/accountant';
import { fetchSendList } from '../api/sendList';
import type { AccountantInvoice, ChecklistInstance, SendListItem } from '../types';

const EMPTY_INVOICES: AccountantInvoice[] = [];
const EMPTY_SEND_LIST: SendListItem[] = [];
const EMPTY_INSTANCES: ChecklistInstance[] = [];

export default function AppPage() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  const isOperations = user?.role === 'operations';

  const [currentId, setCurrentId] = useState<string | null>(() =>
    user?.role === 'accountant' ? 'accountant' : null
  );
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<AccountantInvoice[]>([]);
  const [sendList, setSendList] = useState<SendListItem[]>([]);

  const { data: instances = EMPTY_INSTANCES } = useQuery({
    queryKey: ['checklists'],
    queryFn: fetchChecklists,
    enabled: isOperations,
  });

  const { data: fetchedInvoices = EMPTY_INVOICES } = useQuery({
    queryKey: ['accountant'],
    queryFn: fetchInvoices,
  });

  const { data: fetchedSendList = EMPTY_SEND_LIST } = useQuery({
    queryKey: ['sendList'],
    queryFn: () => fetchSendList(),
    enabled: isOperations,
  });

  useEffect(() => { setInvoices(fetchedInvoices); }, [fetchedInvoices]);
  useEffect(() => { setSendList(fetchedSendList); }, [fetchedSendList]);

  // Select first instance on load (operations only)
  useEffect(() => {
    if (isOperations && instances.length > 0 && !currentId) {
      setCurrentId(instances[0]._id);
    }
  }, [instances, currentId, isOperations]);

  const createMutation = useMutation({
    mutationFn: ({ templateId, invoiceNum }: { templateId: string; invoiceNum: string }) =>
      createChecklist(templateId, invoiceNum),
    onSuccess: (newInst) => {
      qc.setQueryData<ChecklistInstance[]>(['checklists'], (prev = []) => [...prev, newInst]);
      setCurrentId(newInst._id);
      setPendingTemplateId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) => toggleItem(id, index),
    onSuccess: (updated) => {
      qc.setQueryData<ChecklistInstance[]>(['checklists'], (prev = []) =>
        prev.map((i) => (i._id === updated._id ? updated : i))
      );
    },
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => resetChecklist(id),
    onSuccess: (updated) => {
      qc.setQueryData<ChecklistInstance[]>(['checklists'], (prev = []) =>
        prev.map((i) => (i._id === updated._id ? updated : i))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteChecklist(id),
    onSuccess: (_, id) => {
      qc.setQueryData<ChecklistInstance[]>(['checklists'], (prev = []) => prev.filter((i) => i._id !== id));
      if (currentId === id) setCurrentId(null);
    },
  });

  const currentInstance = instances.find((i) => i._id === currentId);
  const isAccountantView = currentId === 'accountant';
  const isLogicallView = currentId === 'logicall';

  return (
    <>
      <Sidebar
        instances={instances}
        accountantInvoices={invoices}
        currentId={currentId}
        role={user?.role ?? 'operations'}
        onSelect={setCurrentId}
        onSelectAccountant={() => setCurrentId('accountant')}
        onSelectLogicall={() => setCurrentId('logicall')}
        onAdd={(templateId) => setPendingTemplateId(templateId)}
        onDelete={(id) => deleteMutation.mutate(id)}
        onLogout={logout}
      />

      <main className="main">
        {!currentId && (
          <div className="empty-state visible">
            <h2>No checklist <em>selected</em></h2>
            <p>Create a new checklist from the sidebar to get started.</p>
          </div>
        )}

        {isLogicallView && <LogicallView />}

        {currentInstance && (
          <ChecklistView
            instance={currentInstance}
            onToggle={(index) => toggleMutation.mutate({ id: currentInstance._id, index })}
            onReset={() => resetMutation.mutate(currentInstance._id)}
            onDelete={() => deleteMutation.mutate(currentInstance._id)}
          />
        )}

        {isAccountantView && (
          <AccountantView
            invoices={invoices}
            sendList={sendList}
            readOnly={!isOperations}
            onInvoicesChange={setInvoices}
            onSendListChange={setSendList}
          />
        )}
      </main>

      {isOperations && pendingTemplateId && (
        <NewChecklistModal
          templateId={pendingTemplateId}
          onConfirm={(invoiceNum) => createMutation.mutate({ templateId: pendingTemplateId, invoiceNum })}
          onClose={() => setPendingTemplateId(null)}
        />
      )}
    </>
  );
}
