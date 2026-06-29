import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const STAGE_PAGES = [
  { to:'/cutting', label:'Cutting', icon:'✂️', role:'cutting_operator' },
  { to:'/stitching', label:'Stitching', icon:'🧵', role:'stitching_operator' },
  { to:'/buttons', label:'Button Attach', icon:'🔘', role:'button_operator' },
  { to:'/checking', label:'Checking', icon:'✅', role:'checking_operator' },
  { to:'/ironing', label:'Ironing', icon:'🧺', role:'ironing_operator' },
  { to:'/stock', label:'Finished Stock', icon:'📦', role:'store_manager' },
];

export default function Layout() {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifCount(data.filter(n => !n.is_read).length);
      } catch {}
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const canSee = (page) => {
    if (isAdmin || isManager) return true;
    return user?.role === page.role;
  };

  const navStyle = (isActive) => ({
    display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
    borderRadius:8, cursor:'pointer', fontSize:13, textDecoration:'none',
    color: isActive ? '#1a56db' : '#64748b',
    background: isActive ? '#e8f0fe' : 'transparent',
    fontWeight: isActive ? 500 : 400,
    transition:'all .15s', marginBottom:2
  });

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:'system-ui,sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: sidebarOpen ? 220 : 60, background:'#fff', borderRight:'0.5px solid rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', transition:'width .2s', flexShrink:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 12px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'#1a56db', display:'flex', alignItems:'center', gap:8 }}>
                ✂️ FabricFlow
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Production Tracker</div>
            </div>
          ) : <div style={{ fontSize:20, textAlign:'center' }}>✂️</div>}
        </div>

        <nav style={{ padding:'10px 8px', flex:1, overflowY:'auto' }}>
          {(isAdmin || isManager) && <>
            <div style={{ fontSize:10, color:'#94a3b8', padding:'6px 8px 3px', fontWeight:500, display: sidebarOpen ? 'block' : 'none' }}>MAIN</div>
            <NavLink to="/" end style={({isActive}) => navStyle(isActive)}>
              <span>📊</span>{sidebarOpen && 'Dashboard'}
            </NavLink>
            <NavLink to="/orders" style={({isActive}) => navStyle(isActive)}>
              <span>📋</span>{sidebarOpen && 'Orders'}
            </NavLink>
            <NavLink to="/sku" style={({isActive}) => navStyle(isActive)}>
              <span>🔍</span>{sidebarOpen && 'SKU Tracking'}
            </NavLink>
          </>}

          <div style={{ fontSize:10, color:'#94a3b8', padding:'10px 8px 3px', fontWeight:500, display: sidebarOpen ? 'block' : 'none' }}>PRODUCTION</div>
          {STAGE_PAGES.filter(canSee).map(p => (
            <NavLink key={p.to} to={p.to} style={({isActive}) => navStyle(isActive)}>
              <span>{p.icon}</span>{sidebarOpen && p.label}
            </NavLink>
          ))}

          {(isAdmin || isManager) && <>
            <div style={{ fontSize:10, color:'#94a3b8', padding:'10px 8px 3px', fontWeight:500, display: sidebarOpen ? 'block' : 'none' }}>MANAGEMENT</div>
            <NavLink to="/inventory" style={({isActive}) => navStyle(isActive)}>
              <span>🏭</span>{sidebarOpen && 'Inventory'}
            </NavLink>
            <NavLink to="/reports" style={({isActive}) => navStyle(isActive)}>
              <span>📈</span>{sidebarOpen && 'Reports'}
            </NavLink>
            <NavLink to="/notifications" style={({isActive}) => navStyle(isActive)}>
              <span>🔔</span>
              {sidebarOpen && <>Notifications {notifCount > 0 && <span style={{ marginLeft:'auto', background:'#dc2626', color:'#fff', borderRadius:20, padding:'1px 6px', fontSize:10 }}>{notifCount}</span>}</>}
            </NavLink>
            {isAdmin && <NavLink to="/users" style={({isActive}) => navStyle(isActive)}>
              <span>👥</span>{sidebarOpen && 'Users'}
            </NavLink>}
          </>}
        </nav>

        <div style={{ padding:'10px 8px', borderTop:'0.5px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 6px', borderRadius:8, cursor:'pointer' }} onClick={handleLogout}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#e8f0fe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#1a56db', flexShrink:0 }}>
              {user?.name?.charAt(0)}
            </div>
            {sidebarOpen && <div>
              <div style={{ fontSize:12, fontWeight:500 }}>{user?.name}</div>
              <div style={{ fontSize:10, color:'#94a3b8' }}>Sign out</div>
            </div>}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,0.08)', height:52, display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#64748b', padding:4 }}>☰</button>
          <div style={{ flex:1 }} />
          <div style={{ fontSize:12, color:'#94a3b8' }}>
            {user?.role?.replace(/_/g,' ')} · {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
        <div style={{ flex:1, overflow:'auto', background:'#f0f4f8', padding:20 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
