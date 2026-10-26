import { useState } from 'react';
import { api } from './api';
import { Gallery } from './Media.jsx';
import { Badge, Pri, fmtDate, STATUSES, useDepartments } from './ui.jsx';

const H3 = ({ children }) => <h3 style={{ fontSize: 13, margin: '16px 0 10px' }}>{children}</h3>;

export function Modal({ title, sub, onClose, children }) {
  return (
    <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div><h3>{title}</h3>{sub && <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>{sub}</p>}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ComplaintModal({ c, ctx, onClose }) {
  const { user, categories, users, run } = ctx;
  const [f, setF] = useState({ category: c.cat, priority: c.priority, officerId: c.officer_id || '', status: c.status, remark: '', fb: '', rating: 5 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const done = (fn, msg) => run(async () => { await fn(); onClose(); }, msg);

  let actions = null;
  if (user.role === 'Admin') {
    actions = (
      <>
        <H3>Manage</H3>
        <div className="form-grid">
          <div><label className="f-label">Category</label><select className="f-select" value={f.category} onChange={set('category')}>{categories.map((x) => <option key={x.id}>{x.name}</option>)}</select></div>
          <div><label className="f-label">Priority</label><select className="f-select" value={f.priority} onChange={set('priority')}>{['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><label className="f-label">Assigned officer</label>
            <select className="f-select" value={f.officerId} onChange={set('officerId')}>
              <option value="">Unassigned</option>
              {users.filter((u) => u.role === 'Officer').map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select></div>
          <div><label className="f-label">Status</label><select className="f-select" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="full"><label className="f-label">Remark (optional)</label><input className="f-input" placeholder="Add a note about this change…" value={f.remark} onChange={set('remark')} /></div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn-dark" onClick={() => done(() => api('/complaints/' + c.id, 'PATCH', { category: f.category, priority: f.priority, officerId: f.officerId || null, status: f.status, remark: f.remark }), `Complaint ${c.code} updated`)}>Save changes</button>
          <button className="btn btn-danger" onClick={() => confirm(`Delete complaint ${c.code}? This cannot be undone.`) && done(() => api('/complaints/' + c.id, 'DELETE'), 'Complaint deleted')}>Delete complaint</button>
        </div>
      </>
    );
  } else if (user.role === 'Officer') {
    if (!c.officer_id) {
      actions = <><H3>Unassigned</H3><button className="btn btn-dark" onClick={() => done(() => api(`/complaints/${c.id}/accept`, 'POST'), 'Accepted ' + c.code)}>Accept this complaint</button></>;
    } else if (c.officer_id === user.id) {
      actions = (
        <>
          <H3>Update status</H3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="mini" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <input className="mini" placeholder="Add a remark…" style={{ flex: 1, minWidth: 160 }} value={f.remark} onChange={set('remark')} />
            <button className="btn btn-dark" onClick={() => done(() => api(`/complaints/${c.id}/status`, 'PATCH', { status: f.status, remark: f.remark }), `Complaint ${c.code} updated`)}>Save</button>
          </div>
        </>
      );
    } else {
      actions = <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, marginTop: 14 }}>This complaint is assigned to {c.officer}.</p>;
    }
  } else if (c.status === 'Resolved' && !c.feedback) {
    actions = (
      <>
        <H3>Leave feedback</H3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="mini" value={f.rating} onChange={set('rating')}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}</select>
          <input className="mini" placeholder="How was the resolution?" style={{ flex: 1 }} value={f.fb} onChange={set('fb')} />
          <button className="btn btn-dark" onClick={() => done(() => api(`/complaints/${c.id}/feedback`, 'POST', { rating: +f.rating, comment: f.fb }), 'Thanks for your feedback')}>Submit</button>
        </div>
      </>
    );
  }

  return (
    <Modal title={c.title} sub={`${c.code} · ${c.cat} · ${c.loc}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge s={c.status} /> <Pri p={c.priority} />
        <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Filed by {c.student} on {fmtDate(c.date)}</span>
      </div>
      {c.description && <p style={{ margin: '0 0 16px', fontSize: 13 }}>{c.description}</p>}
      {c.attachments.length > 0 && <><h3 style={{ fontSize: 13, margin: '0 0 10px' }}>Attachments</h3><Gallery items={c.attachments} /></>}
      <h3 style={{ fontSize: 13, margin: '16px 0 10px' }}>Status history</h3>
      <ul className="timeline">
        {c.history.map((h, i) => <li key={i}><div className="pt" /><div><div className="tt">{h[1]}</div><div className="td">{fmtDate(h[0])}</div></div></li>)}
      </ul>
      {c.comments.length > 0 && <H3>Comments</H3>}
      {c.comments.map((m, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m[0]} <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>· {fmtDate(m[1])}</span></div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{m[2]}</div>
        </div>
      ))}
      {c.feedback && <><H3>Student feedback</H3><div style={{ fontSize: 12.5 }}>{'★'.repeat(c.feedback.rating)} <span style={{ color: 'var(--ink-soft)' }}>{c.feedback.comment}</span></div></>}
      {actions}
    </Modal>
  );
}

export function PersonModal({ p, ctx, onClose }) {
  const depts = useDepartments();
  const [f, setF] = useState({ name: p.name || '', email: p.email || '', role: p.role || 'Student', department: p.dept || '', password: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dept = f.department || depts[0]?.name || '';
  const save = () => {
    if (!f.name.trim() || !f.email.trim()) return ctx.toast('Name and email are required.');
    ctx.run(async () => { await api(p.id ? '/users/' + p.id : '/users', p.id ? 'PUT' : 'POST', { ...f, department: dept }); onClose(); }, 'Saved');
  };
  return (
    <Modal title={p.id ? 'Edit person' : 'Add person'} onClose={onClose}>
      <div className="form-grid">
        <div className="full"><label className="f-label">Full name</label><input className="f-input" value={f.name} onChange={set('name')} /></div>
        <div className="full"><label className="f-label">Email</label><input className="f-input" value={f.email} onChange={set('email')} /></div>
        <div><label className="f-label">Role</label><select className="f-select" value={f.role} onChange={set('role')}>{['Student', 'Officer', 'Admin'].map((r) => <option key={r}>{r}</option>)}</select></div>
        {f.role === 'Officer' && <div><label className="f-label">Department</label><select className="f-select" value={dept} onChange={set('department')}>{depts.map((d) => <option key={d.id}>{d.name}</option>)}</select></div>}
        <div className="full"><label className="f-label">{p.id ? 'New password (leave blank to keep current)' : 'Password (default: ChangeMe123)'}</label><input className="f-input" type="password" value={f.password} onChange={set('password')} /></div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}><button className="btn btn-dark" onClick={save}>Save</button><button className="btn" onClick={onClose}>Cancel</button></div>
    </Modal>
  );
}
