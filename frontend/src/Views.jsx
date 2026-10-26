import { useState } from 'react';
import { api } from './api';
import { PersonModal } from './Modals.jsx';
import { FilePicker } from './Media.jsx';
import { ComplaintTable, Top, Panel, Stats, Bars, isOpen, STATUSES } from './ui.jsx';

/* ---------- Student ---------- */
export function StudentDashboard({ ctx }) {
  const mine = ctx.complaints;
  const active = mine.filter((c) => ['Pending', 'Assigned', 'In Progress', 'Escalated'].includes(c.status)).length;
  return (
    <>
      <Top h={`Welcome back, ${ctx.user.name.split(' ')[0]}`} p="Here's where your complaints currently stand.">
        <button className="btn btn-dark" onClick={() => ctx.go('new')}>+ New complaint</button>
      </Top>
      <Stats items={[[mine.length, 'Total complaints'], [active, 'In progress'], [mine.filter((c) => !isOpen(c)).length, 'Resolved']]} />
      <Panel title="Recent activity" sub="Click a complaint to view its full status history">
        <ComplaintTable items={mine.slice(0, 5)} cols={['id', 'title', 'cat', 'status', 'date']} onOpen={ctx.open} empty="No complaints yet." />
      </Panel>
    </>
  );
}

export function NewComplaint({ ctx }) {
  const [f, setF] = useState({ category: ctx.categories[0]?.name || '', priority: 'Medium', title: '', location: '', description: '' });
  const [files, setFiles] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.title.trim()) return ctx.toast('Please add a title before submitting.');
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    files.forEach((file) => fd.append('files', file));
    ctx.run(async () => { await api('/complaints', 'POST', fd); ctx.go('mine'); }, 'Complaint submitted');
  };
  return (
    <>
      <Top h="Submit a new complaint" p="Give enough detail so the right officer can act on it quickly." />
      <Panel>
        <div className="panel-body">
          <div className="form-grid">
            <div><label className="f-label">Category</label><select className="f-select" value={f.category} onChange={set('category')}>{ctx.categories.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
            <div><label className="f-label">Priority</label><select className="f-select" value={f.priority} onChange={set('priority')}>{['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="full"><label className="f-label">Title</label><input className="f-input" placeholder="e.g. Leaking pipe in Room 118" value={f.title} onChange={set('title')} /></div>
            <div className="full"><label className="f-label">Location</label><input className="f-input" placeholder="e.g. Hostel Block B" value={f.location} onChange={set('location')} /></div>
            <div className="full"><label className="f-label">Description</label><textarea className="f-input" rows="4" placeholder="Describe what happened, when it started, and any impact on you or others." value={f.description} onChange={set('description')} /></div>
            <div className="full"><label className="f-label">Photos / videos (optional)</label><FilePicker files={files} setFiles={setFiles} toast={ctx.toast} /></div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            <button className="btn btn-dark" onClick={submit}>Submit complaint</button>
            <button className="btn" onClick={() => ctx.go('dashboard')}>Cancel</button>
          </div>
        </div>
      </Panel>
    </>
  );
}

export function StudentMine({ ctx }) {
  const n = ctx.complaints.length;
  return (
    <>
      <Top h="My complaints" p={`${n} complaint${n === 1 ? '' : 's'} filed so far`} />
      <Panel><ComplaintTable items={ctx.complaints} cols={['id', 'title', 'cat', 'priority', 'status', 'date']} onOpen={ctx.open} empty={'No complaints yet — use "New Complaint" to file one.'} /></Panel>
    </>
  );
}

/* ---------- Officer ---------- */
const queueOf = (ctx) => ctx.complaints.filter((c) => c.officer_id === ctx.user.id);
const poolOf = (ctx) => ctx.complaints.filter((c) => !c.officer_id);

export function OfficerDashboard({ ctx }) {
  const q = queueOf(ctx), un = poolOf(ctx), open = q.filter(isOpen);
  return (
    <>
      <Top h="Your queue" p={`${un.length} complaint${un.length === 1 ? '' : 's'} waiting to be accepted institution-wide`} />
      <Stats items={[[q.length, 'Assigned to you'], [open.length, 'Open cases'], [open.filter((c) => c.priority === 'High').length, 'High priority open'], [un.length, 'Unassigned']]} />
      <Panel title="Needs attention" sub="Your open complaints, most recent first">
        <ComplaintTable items={open} cols={['id', 'title', 'priority', 'status', 'date']} onOpen={ctx.open} empty="Nothing open in your queue." />
      </Panel>
    </>
  );
}
export const OfficerQueue = ({ ctx }) => (
  <>
    <Top h="My queue" p="All complaints assigned to you" />
    <Panel><ComplaintTable items={queueOf(ctx)} cols={['id', 'title', 'student', 'priority', 'status', 'date']} onOpen={ctx.open} empty="Nothing assigned to you yet." /></Panel>
  </>
);
export const OfficerUnassigned = ({ ctx }) => (
  <>
    <Top h="Unassigned queue" p="Complaints not yet claimed by any officer — accept one to take ownership" />
    <Panel>
      <ComplaintTable items={poolOf(ctx)} cols={['id', 'title', 'cat', 'priority', 'date']} onOpen={ctx.open} empty="No unassigned complaints right now."
        action={(c) => <button className="btn btn-dark" onClick={(e) => { e.stopPropagation(); ctx.run(() => api(`/complaints/${c.id}/accept`, 'POST'), 'Accepted ' + c.code); }}>Accept</button>} />
    </Panel>
  </>
);

/* ---------- Admin ---------- */
export function AdminOverview({ ctx }) {
  const all = ctx.complaints, s = ctx.stats || { byCategory: [], byStatus: [] };
  const byStatus = STATUSES.map((st) => s.byStatus.find((x) => x.label === st)).filter(Boolean);
  return (
    <>
      <Top h="Overview" p="Institution-wide grievance activity" />
      <Stats items={[[all.length, 'Total complaints'], [all.filter(isOpen).length, 'Currently open'], [all.filter((c) => !isOpen(c)).length, 'Resolved / closed'], [all.filter((c) => c.status === 'Escalated').length, 'Escalated']]} />
      <div className="grid-2">
        <Panel title="Complaints by category"><div className="panel-body"><Bars rows={s.byCategory} /></div></Panel>
        <Panel title="Complaints by status"><div className="panel-body"><Bars rows={byStatus} color="var(--navy)" /></div></Panel>
      </div>
      <Panel title="Needs escalation review" sub="Complaints flagged for admin attention">
        <ComplaintTable items={all.filter((c) => c.status === 'Escalated')} cols={['id', 'title', 'officer', 'status', 'date']} onOpen={ctx.open} empty="Nothing escalated right now." />
      </Panel>
    </>
  );
}
export const AdminAll = ({ ctx }) => (
  <>
    <Top h="All complaints" p={`${ctx.complaints.length} records — click a row to edit, reassign, or delete`} />
    <Panel><ComplaintTable items={ctx.complaints} cols={['id', 'title', 'cat', 'officer', 'priority', 'status', 'date']} onOpen={ctx.open} empty="No complaints." /></Panel>
  </>
);

export function AdminPeople({ ctx }) {
  const [pm, setPm] = useState(null); // null = closed, {} = new person, user = edit
  const [cat, setCat] = useState('');
  const remove = (u) => confirm(`Remove ${u.name} from the system?`) && ctx.run(() => api('/users/' + u.id, 'DELETE'), 'Person removed');
  const addCat = () => {
    if (!cat.trim()) return ctx.toast('Enter a category name.');
    ctx.run(async () => { await api('/categories', 'POST', { name: cat.trim() }); setCat(''); }, 'Category added');
  };
  return (
    <>
      <Top h="Users & officers" p="Manage accounts, department routing, and categories">
        <button className="btn btn-dark" onClick={() => setPm({})}>+ Add person</button>
      </Top>
      <Panel title="People" sub={`${ctx.users.length} accounts`}>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Department</th><th /></tr></thead>
          <tbody>
            {ctx.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.role}</td><td>{u.email}</td><td>{u.dept || '—'}</td>
                <td><div className="row-actions">
                  <button className="icon-btn" onClick={() => setPm(u)}>Edit</button>
                  <button className="icon-btn danger" onClick={() => remove(u)}>Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Categories" sub="Used to route new complaints">
        <div className="panel-body">
          <div>{ctx.categories.map((c) => (
            <span className="chip" key={c.id}>{c.name}<button onClick={() => ctx.run(() => api('/categories/' + c.id, 'DELETE'), 'Category removed')}>✕</button></span>
          ))}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 340 }}>
            <input className="mini" placeholder="New category name" style={{ flex: 1 }} value={cat} onChange={(e) => setCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCat()} />
            <button className="btn" onClick={addCat}>Add</button>
          </div>
        </div>
      </Panel>
      {pm && <PersonModal p={pm} ctx={ctx} onClose={() => setPm(null)} />}
    </>
  );
}
