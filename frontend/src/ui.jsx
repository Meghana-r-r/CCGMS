import { useEffect, useState } from 'react';
import { api } from './api';

export const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Escalated'];
export const ROLE_COLOR = { Student: '#1F7A6C', Officer: '#22344B', Admin: '#A8422F' };
export const isOpen = (c) => !['Resolved', 'Closed'].includes(c.status);
export const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  inbox: '<path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 12 3 6h18l-2 6"/><path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.3"/><path d="M16 20c.3-2.6 2-4.6 4.5-5.2"/>',
};
export const Icon = ({ n }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: ICONS[n] || ICONS.grid }} />
);

const BADGE = { Pending: 'b-pending', Assigned: 'b-assigned', 'In Progress': 'b-progress', Resolved: 'b-resolved', Closed: 'b-closed', Rejected: 'b-rejected', Escalated: 'b-escalated' };
export const Badge = ({ s }) => <span className={'badge ' + (BADGE[s] || 'b-pending')}>{s}</span>;
export const Pri = ({ p }) => <span className={'pr-' + p.toLowerCase()}>{p}</span>;

export const Top = ({ h, p, children }) => (
  <div className="topline"><div><h1>{h}</h1><p>{p}</p></div>{children}</div>
);
export const Panel = ({ title, sub, children }) => (
  <div className="panel">
    {title && <div className="panel-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div></div>}
    {children}
  </div>
);
export const Stats = ({ items }) => (
  <div className="stat-row">
    {items.map(([v, l], i) => (
      <div key={l} className={'stat' + (i === 0 ? ' accent' : '')}><div className="v">{v}</div><div className="l">{l}</div></div>
    ))}
  </div>
);
export const Bars = ({ rows, color }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return rows.map((r) => (
    <div className="bar-row" key={r.label}>
      <div className="bl">{r.label}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: (r.value / max) * 100 + '%', background: color }} /></div>
      <div className="bv">{r.value}</div>
    </div>
  ));
};

const muted = { color: 'var(--ink-soft)' };
const COLS = {
  id: ['ID', (c) => c.code, 'id-cell'],
  title: ['Complaint', (c) => c.title],
  cat: ['Category', (c) => c.cat],
  student: ['Student', (c) => c.student],
  officer: ['Officer', (c) => c.officer || <span style={muted}>Unassigned</span>],
  priority: ['Priority', (c) => <Pri p={c.priority} />],
  status: ['Status', (c) => <Badge s={c.status} />],
  date: ['Filed', (c) => fmtDate(c.date)],
};
// One table for every complaint list; `cols` picks which columns to show.
export function ComplaintTable({ items, cols, onOpen, empty, action }) {
  return (
    <table>
      <thead><tr>{cols.map((k) => <th key={k}>{COLS[k][0]}</th>)}{action && <th />}</tr></thead>
      <tbody>
        {items.length ? items.map((c) => (
          <tr key={c.id} className="row-click" onClick={() => onOpen(c)}>
            {cols.map((k) => <td key={k} className={COLS[k][2]}>{COLS[k][1](c)}</td>)}
            {action && <td>{action(c)}</td>}
          </tr>
        )) : <tr><td colSpan={cols.length + (action ? 1 : 0)}><div className="empty">{empty}</div></td></tr>}
      </tbody>
    </table>
  );
}

export function useDepartments() {
  const [d, setD] = useState([]);
  useEffect(() => { api('/departments').then(setD).catch(() => {}); }, []);
  return d;
}
