import React, { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api';

export const AuditPage = () => {
  const [logs, setLogs] = useState([]); const [error, setError] = useState('');
  useEffect(() => { let active = true; api.get('/admin/audit-logs', { params: { limit: 50 } }).then(({ data }) => { if (active) setLogs(data.data.items); }).catch((requestError) => { if (active) setError(apiErrorMessage(requestError, 'Unable to load audit history.')); }); return () => { active = false; }; }, []);
  return <main className="audit-page mx-auto max-w-6xl space-y-6 text-gray-100"><header className="audit-hero"><p className="eyebrow">Administration / Security</p><h1 className="mt-2 text-3xl font-bold text-white">Audit history</h1><p className="mt-2 text-sm text-gray-400">Recent role, account, publishing, attendance and administration actions.</p></header>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="audit-list overflow-hidden rounded-2xl border border-white/10">{logs.map((log) => <article key={log._id} className="grid gap-2 border-b border-white/5 p-4 last:border-0 sm:grid-cols-[1fr_1fr_auto]"><div><p className="font-medium text-white">{log.action}</p><p className="mt-1 text-xs text-gray-400">{log.resourceType}{log.resourceId ? ` · ${log.resourceId}` : ''}</p></div><div className="text-xs text-gray-300">{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}<p className="mt-1 text-gray-500">Request {log.requestId || '—'}</p></div><time className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</time></article>)}{!logs.length && !error && <p className="p-12 text-center text-sm text-gray-400">No audit events have been recorded yet.</p>}</div></main>;
};

export default AuditPage;
