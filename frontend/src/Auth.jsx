import { useState } from 'react';
import { api, setToken } from './api';
import { useDepartments } from './ui.jsx';

const DEMO = { Student: 'asha.rao@college.edu', Officer: 'r.menon@college.edu', Admin: 'n.iyer@college.edu' };
const Mark = () => (
  <div className="auth-mark"><div className="sq">C</div><div><div className="name">CCGMS</div><div className="sub">Grievance Management</div></div></div>
);
const Tabs = ({ roles, value, onChange }) => (
  <div className="role-tabs">
    {roles.map((r) => <button key={r} className={r === value ? 'active' : ''} onClick={() => onChange(r)}>{r}</button>)}
  </div>
);

export default function Auth({ onLogin, toast }) {
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('Student');
  const [f, setF] = useState({ email: DEMO.Student, password: 'password123', name: '', department: '' });
  const depts = useDepartments();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickRole = (r) => { setRole(r); if (mode === 'signin') setF({ ...f, email: DEMO[r] }); };

  const signIn = async () => {
    try {
      const { token, user } = await api('/auth/login', 'POST', { email: f.email, password: f.password, role });
      setToken(token);
      onLogin(user);
    } catch (e) { toast(e.message); }
  };
  const register = async () => {
    if (!f.name.trim() || !f.email.trim() || !f.password) return toast('Please fill in your name, email and password.');
    try {
      await api('/auth/register', 'POST', { name: f.name, email: f.email, password: f.password, role, department: f.department || depts[0]?.name });
      toast('Account created — you can now sign in.');
      setMode('signin');
    } catch (e) { toast(e.message); }
  };

  return (
    <div id="auth">
      {mode === 'signin' ? (
        <div className="auth-card">
          <Mark />
          <h1>Sign in to your account</h1>
          <p className="lead">Demo accounts share the password <b>password123</b>.</p>
          <Tabs roles={['Student', 'Officer', 'Admin']} value={role} onChange={pickRole} />
          <div className="field"><label>Email</label><input value={f.email} onChange={set('email')} /></div>
          <div className="field"><label>Password</label><input type="password" value={f.password} onChange={set('password')} onKeyDown={(e) => e.key === 'Enter' && signIn()} /></div>
          <button className="btn-primary" onClick={signIn}>Sign in</button>
          <div className="auth-foot">New here? <button className="link" onClick={() => { setMode('register'); setRole('Student'); setF({ ...f, email: '', password: '' }); }}>Create an account</button></div>
        </div>
      ) : (
        <div className="auth-card">
          <Mark />
          <h1>Create your account</h1>
          <p className="lead">Students and officers can register here; admin accounts are provisioned separately.</p>
          <Tabs roles={['Student', 'Officer']} value={role} onChange={pickRole} />
          <div className="field"><label>Full name</label><input placeholder="e.g. Priya Sharma" value={f.name} onChange={set('name')} /></div>
          <div className="field"><label>College email</label><input placeholder="you@college.edu" value={f.email} onChange={set('email')} /></div>
          {role === 'Officer' && (
            <div className="field"><label>Department</label>
              <select value={f.department || depts[0]?.name || ''} onChange={set('department')}>{depts.map((d) => <option key={d.id}>{d.name}</option>)}</select>
            </div>
          )}
          <div className="field"><label>Password</label><input type="password" placeholder="Choose a password" value={f.password} onChange={set('password')} /></div>
          <button className="btn-primary" onClick={register}>Create account</button>
          <div className="auth-foot">Already registered? <button className="link" onClick={() => { setMode('signin'); setF({ ...f, email: DEMO[role] || '', password: 'password123' }); }}>Sign in</button></div>
        </div>
      )}
    </div>
  );
}
