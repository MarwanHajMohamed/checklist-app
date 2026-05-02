export interface User {
  id: string;
  email: string;
  role: 'operations' | 'accountant';
}

export interface ChecklistItem {
  text: string;
  note?: string;
  warning?: string;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistTemplate {
  id: string;
  group: string;
  name: string;
  tag: string;
  titleHtml: string;
  sections: ChecklistSection[];
}

export interface ChecklistInstance {
  _id: string;
  templateId: string;
  invoiceNum: string;
  doneItems: number[];
  createdAt: string;
  updatedAt: string;
}

export interface AttachedFile {
  _id: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface AccountantInvoice {
  _id: string;
  num: string;
  sent: boolean;
  order: number;
  files: AttachedFile[];
  createdAt: string;
  updatedAt: string;
}

export interface SendListItem {
  _id: string;
  num: string;
  done: boolean;
  order: number;
  date: string;
}
