import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('admin@fabricflow.com');
  const [password, setPassword] = useState('admin123');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.08)', padding:'40px 36px', width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>✂️</div>
          <h1 style={{ fontSize:22, fontWeight:600, color:'#1a56db', margin:0 }}>FabricFlow</h1>
          <p style={{ color:'#64748b', fontSize:14, marginTop:4 }}>Production Tracking System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:14, boxSizing:'border-box' }} required />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:14, boxSizing:'border-box' }} required />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'11px', background:'#1a56db', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:500, cursor:'pointer' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop:20, padding:14, background:'#f8fafc', borderRadius:8, fontSize:12, color:'#64748b' }}>
          <strong>Demo credentials:</strong><br />
          Email: admin@fabricflow.com<br />
          Password: admin123
        </div>
      </div>
    </div>
  );
}
