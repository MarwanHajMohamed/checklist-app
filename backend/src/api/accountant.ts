import client, { getAccessToken, API_ORIGIN } from './client';
import type { AccountantInvoice } from '../types';

export const fetchInvoices = () =>
  client.get<AccountantInvoice[]>('/accountant').then((r) => r.data);

export const createInvoice = (num: string) =>
  client.post<AccountantInvoice>('/accountant', { num }).then((r) => r.data);

export const updateInvoice = (id: string, data: { num?: string; sent?: boolean }) =>
  client.patch<AccountantInvoice>(`/accountant/${id}`, data).then((r) => r.data);

export const reorderInvoices = (order: { id: string }[]) =>
  client.patch('/accountant/reorder', { order }).then((r) => r.data);

export const deleteInvoice = (id: string) =>
  client.delete(`/accountant/${id}`).then((r) => r.data);

export const uploadFiles = (invoiceId: string, files: File[]) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  return client.post<{ files: AccountantInvoice['files'] }>(`/accountant/${invoiceId}/files`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const deleteFile = (invoiceId: string, fileId: string) =>
  client.delete(`/accountant/${invoiceId}/files/${fileId}`).then((r) => r.data);

export function downloadFileUrl(invoiceId: string, fileId: string) {
  return `${API_ORIGIN}/api/accountant/${invoiceId}/files/${fileId}`;
}

export async function downloadFile(invoiceId: string, fileId: string, originalName: string) {
  const token = getAccessToken();
  const response = await fetch(`${API_ORIGIN}/api/accountant/${invoiceId}/files/${fileId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  a.click();
  URL.revokeObjectURL(url);
}
