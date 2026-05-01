import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import ChecklistView from '../components/ChecklistView';
import AccountantView from '../components/AccountantView';
import NewChecklistModal from '../components/NewChecklistModal';
import { useAuth } from '../contexts/AuthContext';
import { fetchChecklists, createChecklist, toggleItem, resetChecklist, deleteChecklist } from '../api/checklists';
import { fetchInvoices } from '../api/accountant';
import { fetchSendList } from '../api/sendList';
import type { AccountantInvoice, ChecklistInstance, SendListItem } from '../types';

export default function AppPage() {
  const { logout } = useAuth();
  const qc = useQueryClient();

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  // Local state mirrors for accountant/sendlist to allow optimistic updates
  const [invoices, setInvoices] = useState<AccountantInvoice[]>([]);
  const [sendList, setSendList] = useState<SendListItem[]>([]);

  const { data: instances = [] } = useQuery({
    queryKey: ['checklists'],
    queryFn: fetchChecklists,
  });

  const { data: fetchedInvoices = [] } = useQuery({
    queryKey: ['accountant'],
    queryFn: fetchInvoices,
  });

  const { data: fetchedSendList = [] } = useQuery({
    queryKey: ['sendList'],
    queryFn: fetchSendList,
  });

  useEffect(() => { setInvoices(fetchedInvoices); }, [fetchedInvoices]);
  useEffect(() => { setSendList(fetchedSendList); }, [fetchedSendList]);

  // Select first instance on load
  useEffect(() => {
    if (instances.length > 0 && !currentId) {
      setCurrentId(instances[0]._id);
    }
  }, [instances, currentId]);

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
  const isAccountant = currentId === 'accountant';

  return (
    <>
      <Sidebar
        instances={instances}
        accountantInvoices={invoices}
        currentId={currentId}
        onSelect={setCurrentId}
        onSelectAccountant={() => setCurrentId('accountant')}
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

        {currentInstance && (
          <ChecklistView
            instance={currentInstance}
            onToggle={(index) => toggleMutation.mutate({ id: currentInstance._id, index })}
            onReset={() => resetMutation.mutate(currentInstance._id)}
            onDelete={() => deleteMutation.mutate(currentInstance._id)}
          />
        )}

        {isAccountant && (
          <AccountantView
            invoices={invoices}
            sendList={sendList}
            onInvoicesChange={setInvoices}
            onSendListChange={setSendList}
          />
        )}
      </main>

      {pendingTemplateId && (
        <NewChecklistModal
          templateId={pendingTemplateId}
          onConfirm={(invoiceNum) => createMutation.mutate({ templateId: pendingTemplateId, invoiceNum })}
          onClose={() => setPendingTemplateId(null)}
        />
      )}
    </>
  );
}
