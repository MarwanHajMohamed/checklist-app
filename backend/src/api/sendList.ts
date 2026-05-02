import client from './client';
import type { SendListItem } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

export const fetchSendList = (date?: string) =>
  client.get<SendListItem[]>('/send-list', { params: { date: date || today() } }).then((r) => r.data);

export const addSendItem = (num: string) =>
  client.post<SendListItem>('/send-list', { num, date: today() }).then((r) => r.data);

export const updateSendItem = (id: string, data: { done?: boolean; num?: string }) =>
  client.patch<SendListItem>(`/send-list/${id}`, data).then((r) => r.data);

export const reorderSendList = (order: { id: string }[]) =>
  client.patch('/send-list/reorder', { order }).then((r) => r.data);

export const deleteSendItem = (id: string) =>
  client.delete(`/send-list/${id}`).then((r) => r.data);

export const clearDoneSendItems = () =>
  client.delete('/send-list/clear-done', { params: { date: today() } }).then((r) => r.data);
