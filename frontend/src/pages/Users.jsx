import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const ROLES = [
  { value:'admin', label:'Admin' },
  { value:'production_manager', label:'Production Manager' },
  { value:'cutting_operator', label:'Cutting Operator' },
  { value:'stitching_operator', label:'Stitching Operator' },
  { value:'button_operator', label:'Button Operator' },
  { value:'checking_operator', label:'Checking Operator' },
  { value:'ironing_operator', label:'Ironing Operator' },
  { value:'store_manager', label:'Store Manager' },
];

const ROLE_COLORS = {
  admin:'#dc2626', production_manager:'#7c3aed', cutting_operator:'#d97706',
  stitching_operator:'#1a56db', button_operator:'#0d9488', checking_operator:'#16a34a',
  ironing_operator:'#dc2626', store_manager:'#64748b',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'cutting_operator' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
    setSaving(true);
    try {
      await api.post('/auth/users', form);
      toast.success('User created!');
      setShowModal(false);
      setForm({ name:'', email:'', password:'', role:'cutting_operator' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/auth/users/${user.id}`, { ...user, active: !user.active });
      toast.success(user.active ? 'User deactivated' : 'User activated');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:500 }}>User management</div>
        <button onClick={() => setShowModal(true)}
          style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer' }}>
          + Add user
        </button>
      </div>

      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Name','Email','Role','Status','Actions'].map(h => (
              <th key={h} style={{ fontSize:11, fontWeight:500, color:'#64748b', textAlign:'left', padding:'10px 16px', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.05)', opacity: u.active ? 1 : 0.5 }}>
                <td style={{ padding:'11px 16px', fontSize:13 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'#e8f0fe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#1a56db', flexShrink:0 }}>
                      {u.name?.charAt(0)}
                    </div>
                    <span style={{ fontWeight:500 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding:'11px 16px', fontSize:12, color:'#64748b' }}>{u.email}</td>
                <td style={{ padding:'11px 16px' }}>
                  <span style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:`${ROLE_COLORS[u.role]}20`, color: ROLE_COLORS[u.role], fontWeight:500 }}>
                    {ROLES.find(r => r.value === u.role)?.label || u.role}
                  </span>
                </td>
                <td style={{ padding:'11px 16px' }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: u.active ? '#dcfce7' : '#fee2e2', color: u.active ? '#16a34a' : '#dc2626', fontWeight:500 }}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding:'11px 16px' }}>
                  <button onClick={() => toggleActive(u)}
                    style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:11, cursor:'pointer' }}>
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:420 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>Add new user</div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[['Full Name','name','text'],['Email','email','email'],['Password','password','password']].map(([label,name,type]) => (
                <div key={name}>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>{label}</label>
                  <input type={type} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, background:'#fff' }}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button onClick={() => setShowModal(false)} style={{ flex:1, padding:'10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
