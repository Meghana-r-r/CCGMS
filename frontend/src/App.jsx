import { useCallback, useEffect, useRef, useState } from 'react';
import { api, hasToken, setToken } from './api';
import Auth from './Auth.jsx';
import { ComplaintModal } from './Modals.jsx';
import { Icon, ROLE_COLOR } from './ui.jsx';
import * as V from './Views.jsx';

const NAVS = {
  Student: [['dashboard', 'Dashboard', 'grid'], ['new', 'New Complaint', 'plus'], ['mine', 'My Complaints', 'list']],
  Officer: [['dashboard', 'Dashboard', 'grid'], ['queue', 'My Queue', 'inbox'], ['unassigned', 'Unassigned Queue', 'list']],
  Admin: [['dashboard', 'Overview', 'grid'], ['all', 'All Complaints', 'list'], ['people', 'Users & Officers', 'users']],
};
const VIEWS = {
  Student: { dashboard: V.StudentDashboard, new: V.NewComplaint, mine: V.StudentMine },
  Officer: { dashboard: V.OfficerDashboard, queue: V.OfficerQueue, unassigned: V.OfficerUnassigned },
  Admin: { dashboard: V.AdminOverview, all: V.AdminAll, people: V.AdminPeople },
};
const EMPTY = { complaints: [], categories: [], users: [], stats: null };

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(hasToken());
  const [view, setView] = useState('dashboard');
  const [data, setData] = useState(EMPTY);
  const [selId, setSelId] = useState(null);
  const [msg, setMsg] = useState('');
  const timer = useRef();

  const toast = useCallback((m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); setData(EMPTY); setSelId(null); }, []);

  const reload = useCallback(async (u) => {
    const jobs = [api('/complaints'), api('/categories')];
    if (u.role === 'Admin') jobs.push(api('/users'), api('/stats'));
    const [complaints, categories, users = [], stats = null] = await Promise.all(jobs);
    setData({ complaints, categories, users, stats });
  }, []);

  // Restore an existing session on first load.
  useEffect(() => {
    if (!hasToken()) return;
    api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setBooting(false));
  }, []);
  useEffect(() => { if (user) reload(user).catch((e) => (e.status === 401 ? logout() : toast(e.message))); }, [user, reload, logout, toast]);

  // Runs an API action, refreshes the data, then shows a toast (or the error).
  const run = async (fn, okMsg) => {
    try { await fn(); await reload(user); okMsg && toast(okMsg); }
    catch (e) { e.status === 401 ? logout() : toast(e.message); }
  };

  if (booting) return null;
  if (!user) return <><Auth onLogin={(u) => { setView('dashboard'); setUser(u); }} toast={toast} /><div className={'toast' + (msg ? ' show' : '')}>{msg}</div></>;

  const ctx = { user, ...data, go: setView, open: (c) => setSelId(c.id), run, toast };
  const View = VIEWS[user.role][view];
  const sel = data.complaints.find((c) => c.id === selId);

  return (
    <>
      <div id="app" className="show">
        <aside className="sidebar">
          <div className="brand"><div className="sq">C</div><span>CCGMS</span></div>
          <div className="nav-group">
            {NAVS[user.role].map(([key, label, icon]) => (
              <button key={key} className={'nav-item' + (key === view ? ' active' : '')} onClick={() => setView(key)}>
                <span className="ic"><Icon n={icon} /></span>{label}
              </button>
            ))}
          </div>
          <div className="sidebar-foot">
            <div className="who">
              <div className="avatar" style={{ background: ROLE_COLOR[user.role] }}>{user.name[0]}</div>
              <div><div className="n">{user.name}</div><div className="r">{user.role}</div></div>
            </div>
            <button className="signout" onClick={logout}>Sign out</button>
          </div>
        </aside>
        <main><View ctx={ctx} /></main>
      </div>
      {sel && <ComplaintModal key={sel.id} c={sel} ctx={ctx} onClose={() => setSelId(null)} />}
      <div className={'toast' + (msg ? ' show' : '')}>{msg}</div>
    </>
  );
}
