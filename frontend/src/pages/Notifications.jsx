import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  error:   { bg:'#fee2e2', color:'#dc2626', icon:'🚨' },
  warning: { bg:'#fef3c7', color:'#d97706', icon:'⚠️' },
  success: { bg:'#dcfce7', color:'#16a34a', icon:'✅' },
  info:    { bg:'#e8f0fe', color:'#1a56db', icon:'ℹ️' },
};

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifs(n => n.map(x => ({ ...x, is_read: true })));
      toast.success('All marked as read');
    } catch {}
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:15, fontWeight:500 }}>Notifications</div>
          {unread > 0 && (
            <span style={{ background:'#dc2626', color:'#fff', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:500 }}>{unread} unread</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            style={{ padding:'7px 14px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:12, cursor:'pointer' }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading...</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🔔</div>
            <div>No notifications yet</div>
          </div>
        ) : notifs.map((n, i) => {
          const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
          return (
            <div key={n.id} onClick={() => !n.is_read && markRead(n.id)}
              style={{ display:'flex', gap:12, padding:'14px 16px', borderBottom: i < notifs.length-1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', background: n.is_read ? '#fff' : '#fafbff', cursor: n.is_read ? 'default' : 'pointer', transition:'background .15s' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background: cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {cfg.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontSize:13, fontWeight: n.is_read ? 400 : 600, color: n.is_read ? '#64748b' : '#1e293b' }}>{n.title}</div>
                  {!n.is_read && <div style={{ width:7, height:7, borderRadius:'50%', background:'#1a56db', flexShrink:0, marginTop:4 }} />}
                </div>
                {n.message && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{n.message}</div>}
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4, display:'flex', gap:12 }}>
                  <span>{new Date(n.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                  {n.related_sku && <span style={{ color: cfg.color }}>SKU: {n.related_sku}</span>}
                  {n.related_order && <span>Order: {n.related_order}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
