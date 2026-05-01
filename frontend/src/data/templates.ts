import type { ChecklistTemplate } from '../types';

export const TEMPLATES: ChecklistTemplate[] = [
  {
    group: 'Export',
    id: 'export-invoice',
    name: 'Export invoice',
    tag: 'Export process',
    titleHtml: 'Export <em>invoice</em>',
    sections: [
      {
        title: 'Sales order',
        items: [
          { text: 'Create a sales order' },
          { text: 'Search for and select the customer' },
          { text: 'Select Sabri Bein as the sales rep' },
        ],
      },
      {
        title: 'Items',
        items: [
          { text: 'Add items from inventory' },
          { text: 'Add 2 data loggers' },
          { text: 'Add 2 certificate of origin / certified invoices' },
          { text: 'Update sell price and quantities as per the PO' },
        ],
      },
      {
        title: 'Invoice generation',
        items: [
          { text: 'Save and generate actual invoice' },
          {
            text: 'Add freight forwarder, courier name, delivery method, number & kind of packages, destination country, dimensions, total gross weight, customer PO, and temperature condition (Ambient 15–25°C or Cold Chain 2–8°C)',
          },
        ],
      },
      {
        title: 'Finalise',
        items: [
          { text: 'Print and save invoice and packing slip in the client folder' },
          { text: 'Request signature from Sabri' },
          { text: 'Complete the COO' },
        ],
      },
    ],
  },
  {
    group: 'Export',
    id: 'coo',
    name: 'COO',
    tag: 'Export process',
    titleHtml: 'Certificate of <em>origin</em>',
    sections: [
      {
        title: 'Form details',
        items: [
          { text: 'Section 1 — Consignor: select <strong>Zeymos</strong>' },
          { text: 'Section 2 — Consignee: select customer' },
          { text: 'Section 3 — Method of transport: select Air Freight or Sea Freight' },
          { text: 'Enter number of pallets/boxes and total weight' },
          { text: 'Section 11 — Remarks: enter data loggers' },
        ],
      },
      {
        title: 'Item details',
        items: [
          { text: 'Section 5 — Originated in: select the origin countries' },
          {
            text: 'Section 6: copy and paste item details from invoice',
            note: 'Format: Name · Pack size · Qty / BN / Exp · Shelf life · MA Holder · Origin',
          },
          {
            text: "Add manufacturer's address",
            warning: 'Address must match the origin country',
          },
        ],
      },
      {
        title: 'Finalise',
        items: [{ text: 'Invoice details: add invoice number and invoice amount' }],
      },
      {
        title: 'Submit',
        items: [{ text: 'Attach signed invoice' }, { text: 'Save and submit' }],
      },
    ],
  },
  {
    group: 'Export',
    id: 'shipping-export',
    name: 'Shipping details folder (export)',
    tag: 'Export process',
    titleHtml: 'Shipping details <em>folder</em>',
    sections: [
      {
        title: 'Documents required',
        items: [
          { text: 'Certified invoice' },
          { text: 'Packing list' },
          { text: 'Airway bill' },
          { text: 'COO' },
          { text: 'COA if needed' },
        ],
      },
    ],
  },
  {
    group: 'Export',
    id: 'audit-trail',
    name: 'Shipment audit trail',
    tag: 'Export process — internal',
    titleHtml: 'Shipment <em>audit trail</em>',
    sections: [
      {
        title: 'Documents required',
        items: [
          { text: 'Goods collection note' },
          { text: 'Invoice' },
          { text: 'Airway bill' },
          { text: 'Export clearance' },
          { text: 'Certificate of shipment' },
          { text: 'Invoice from Logicall (if any)' },
          { text: 'Data logger(s)' },
          {
            text: 'Flight tracker — <a href="https://www.saudiacargo.com/en/digital-services?tab=trackShipment" target="_blank" rel="noopener noreferrer">Saudia Cargo</a>',
          },
        ],
      },
    ],
  },
  {
    group: 'Local',
    id: 'local-invoice',
    name: 'Local invoice',
    tag: 'Local process',
    titleHtml: 'Local <em>invoice</em>',
    sections: [
      {
        title: 'Sales order',
        items: [
          { text: 'Create a sales order' },
          { text: 'Search for and select the customer' },
          { text: 'Select Sabri Bein as the sales rep' },
        ],
      },
      {
        title: 'Items',
        items: [
          { text: 'Add items from inventory' },
          { text: 'Update sell price and quantities as per the PO' },
        ],
      },
      {
        title: 'Invoice generation',
        items: [
          { text: 'Save and generate actual invoice' },
          {
            text: 'Add freight forwarder, courier name, delivery method, number & kind of packages, destination country, dimensions, total gross weight, customer PO, and temperature condition (Ambient 15–25°C or Cold Chain 2–8°C)',
          },
        ],
      },
      {
        title: 'Finalise',
        items: [{ text: 'Print and save invoice and packing slip in the client folder' }],
      },
    ],
  },
  {
    group: 'Local',
    id: 'shipping-local',
    name: 'Shipping details folder (local)',
    tag: 'Local process',
    titleHtml: 'Shipping details <em>folder</em>',
    sections: [
      {
        title: 'Documents required',
        items: [{ text: 'Invoice' }, { text: 'Packing list' }],
      },
    ],
  },
  {
    group: 'Local',
    id: 'audit-trail-local',
    name: 'Shipment audit trail (local)',
    tag: 'Local process — internal',
    titleHtml: 'Shipment <em>audit trail</em>',
    sections: [
      {
        title: 'Documents required',
        items: [
          { text: 'Goods collection note' },
          { text: 'Invoice' },
          { text: 'Data logger(s)' },
        ],
      },
    ],
  },
];

export function getTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id);
}

export function totalItems(templateId: string): number {
  const t = getTemplate(templateId);
  if (!t) return 0;
  return t.sections.reduce((s, sec) => s + sec.items.length, 0);
}

export function flatIndex(templateId: string, sectionIdx: number, itemIdx: number): number {
  const t = getTemplate(templateId);
  if (!t) return 0;
  let idx = 0;
  for (let s = 0; s < sectionIdx; s++) idx += t.sections[s].items.length;
  return idx + itemIdx;
}
