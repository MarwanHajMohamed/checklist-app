import client from './client';
import type { ChecklistInstance } from '../types';

export const fetchChecklists = () =>
  client.get<ChecklistInstance[]>('/checklists').then((r) => r.data);

export const createChecklist = (templateId: string, invoiceNum: string) =>
  client.post<ChecklistInstance>('/checklists', { templateId, invoiceNum }).then((r) => r.data);

export const toggleItem = (id: string, index: number) =>
  client.patch<ChecklistInstance>(`/checklists/${id}/toggle`, { index }).then((r) => r.data);

export const resetChecklist = (id: string) =>
  client.patch<ChecklistInstance>(`/checklists/${id}/reset`).then((r) => r.data);

export const deleteChecklist = (id: string) =>
  client.delete(`/checklists/${id}`).then((r) => r.data);
