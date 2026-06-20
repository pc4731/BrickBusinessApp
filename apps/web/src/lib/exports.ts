'use client';

import type { GeneratedDoc } from './entities';
import { api } from './api';
import { useAuthStore } from './auth-store';
import type { DateRangeParams } from './resources';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Fetches a binary file with the auth header and triggers a browser download. */
async function downloadBlob(path: string, filename: string) {
  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${API_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const exportsApi = {
  downloadReportExcel: (
    report: string,
    range?: DateRangeParams & { customerId?: string; renter?: string },
  ) => {
    const sp = new URLSearchParams();
    if (range?.dateFrom) sp.set('dateFrom', range.dateFrom);
    if (range?.dateTo) sp.set('dateTo', range.dateTo);
    if (range?.customerId) sp.set('customerId', range.customerId);
    if (range?.renter) sp.set('renter', range.renter);
    const qs = sp.toString();
    return downloadBlob(`/exports/excel/${report}${qs ? `?${qs}` : ''}`, `${report}-report.xlsx`);
  },

  requestDocument: (type: string, orderId: string) =>
    api<GeneratedDoc>('/exports/documents', { method: 'POST', body: { type, orderId } }),

  getDocument: (id: string) => api<GeneratedDoc>(`/exports/documents/${id}`),

  /** Request a document, poll until the async job finishes, then download it. */
  async generateAndDownload(type: string, orderId: string) {
    const doc = await exportsApi.requestDocument(type, orderId);
    for (let i = 0; i < 20; i++) {
      const status = await exportsApi.getDocument(doc.id);
      if (status.status === 'READY') {
        await downloadBlob(`/exports/documents/${doc.id}/download`, `${status.number}.pdf`);
        return;
      }
      if (status.status === 'FAILED') throw new Error('Document generation failed');
      await delay(700);
    }
    throw new Error('Document is taking too long — try again shortly');
  },
};
