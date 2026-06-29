import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const STAGE_LABELS = { cutting:'Cutting', stitching:'Stitching', button_attachment:'Button Attach', checking_trimming:'Checking & Trimming', ironing:'Ironing', finished_stock:'Finished Stock' };
const STAGE_ORDER = ['cutting','stitching','button_attachment','checking_trimming','ironing','finished_stock'];
const STAGE_COLORS = { cutting:'#7c3aed', stitching:'#1a56db', button_attachment:'#d97706', checking_trimming:'#0d9488', ironing:'#dc2626', finished_stock:'#16a34a' };

export default function SKUTracking() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const track = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${query.trim().toUpperCase()}`);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'SKU not found');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = result ? STAGE_ORDER.indexOf(result.current_stage) : -1;

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:24 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && track()}
          placeholder="Enter or scan SKU ID (e.g. SKU-001)..."
          style={{ flex:1, maxWidth:420, padding:'10px 14px', borderRadius:10, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:14, background:'#fff' }} />
        <button onClick={track} disabled={loading}
          style={{ padding:'10px 20px', background:'#1a56db', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer' }}>
          {loading ? 'Tracking...' : '🔍 Track'}
        </button>
      </div>

      {!result && !loading && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:15, fontWeight:500, marginBottom:6, color:'#64748b' }}>Enter a SKU ID to track production</div>
          <div style={{ fontSize:13 }}>Supports SKU ID or Order Number</div>
        </div>
      )}

      {result && (
        <div>
          {/* Header card */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:22, fontWeight:600, color:'#1a56db' }}>{result.sku_id}</div>
                <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>
                  {result.style_name} · {result.product_name} · {result.color} · Size {result.size} · {result.customer_name} · {result.order_number}
                </div>
              </div>
              <span style={{ background:'#e8f0fe', color:'#1a56db', padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:500 }}>
                {STAGE_LABELS[result.current_stage]}
              </span>
            </div>

            {/* Stage pipeline */}
            <div style={{ display:'flex', gap:0, marginBottom:16, overflowX:'auto' }}>
              {STAGE_ORDER.map((s, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                const entry = result.stageMap?.[s];
                return (
                  <div key={s} style={{ flex:1, minWidth:90, padding:'10px 12px', background: active ? '#f8faff' : done ? '#f0faf4' : '#fafafa', border:'0.5px solid rgba(0,0,0,0.07)', borderLeft: i > 0 ? 'none' : '', borderRadius: i===0 ? '8px 0 0 8px' : i===STAGE_ORDER.length-1 ? '0 8px 8px 0' : 0 }}>
                    <div style={{ fontSize:10, color: active ? STAGE_COLORS[s] : done ? '#16a34a' : '#94a3b8', marginBottom:2 }}>{STAGE_LABELS[s]}</div>
                    <div style={{ fontSize:16, fontWeight:500, color: active ? STAGE_COLORS[s] : done ? '#16a34a' : '#cbd5e1' }}>
                      {done ? '✓' : active ? '●' : '○'}
                    </div>
                    {entry && <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{entry.quantity_completed?.toLocaleString()} pcs</div>}
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom:6, fontSize:12, color:'#64748b' }}>Overall progress — {result.completion_pct}%</div>
            <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'#1a56db', width:`${result.completion_pct}%`, borderRadius:4, transition:'width .5s' }} />
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10, marginBottom:16 }}>
            {[
              ['Ordered', result.quantity?.toLocaleString(), '#1e293b'],
              ['Cutting', result.stageMap?.cutting?.quantity_completed?.toLocaleString() || '0', '#7c3aed'],
              ['Stitching', result.stageMap?.stitching?.quantity_completed?.toLocaleString() || '0', '#1a56db'],
              ['Buttons', result.stageMap?.button_attachment?.quantity_completed?.toLocaleString() || '0', '#d97706'],
              ['Checking', result.stageMap?.checking_trimming?.quantity_completed?.toLocaleString() || '0', '#0d9488'],
              ['Ironing', result.stageMap?.ironing?.quantity_completed?.toLocaleString() || '0', '#dc2626'],
              ['Finished', result.stageMap?.finished_stock?.quantity_completed?.toLocaleString() || '0', '#16a34a'],
              ['Rejected', result.total_rejected?.toLocaleString() || '0', '#dc2626'],
              ['Remaining', result.remaining?.toLocaleString() || '0', '#1e293b'],
              ['Due Date', new Date(result.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }), new Date(result.due_date) < new Date() ? '#dc2626' : '#1e293b'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:16, fontWeight:500, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Movement history */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:16 }}>Movement history</div>
            <div style={{ borderLeft:'2px solid rgba(0,0,0,0.1)', paddingLeft:16, marginLeft:8 }}>
              {STAGE_ORDER.map((s, i) => {
                const entry = result.stageMap?.[s];
                const done = entry?.is_completed;
                const active = result.current_stage === s;
                return (
                  <div key={s} style={{ position:'relative', paddingBottom:16 }}>
                    <div style={{ position:'absolute', left:-21, top:4, width:10, height:10, borderRadius:'50%', background: done ? '#16a34a' : active ? '#1a56db' : '#e2e8f0', border:'2px solid #fff' }} />
                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>
                      {entry ? new Date(entry.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Pending'}
                      {entry?.operator_name && ` · ${entry.operator_name}`}
                    </div>
                    <div style={{ fontSize:13, fontWeight:500 }}>
                      {STAGE_LABELS[s]}
                      <span style={{ marginLeft:8, fontSize:11, padding:'2px 8px', borderRadius:20, background: done ? '#dcfce7' : active ? '#e8f0fe' : '#f1f5f9', color: done ? '#16a34a' : active ? '#1a56db' : '#94a3b8', fontWeight:400 }}>
                        {done ? 'completed' : active ? 'in progress' : 'pending'}
                      </span>
                    </div>
                    {entry && (
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                        Received: {entry.quantity_received?.toLocaleString()} · Completed: {entry.quantity_completed?.toLocaleString()} · Rejected: {entry.quantity_rejected || 0}
                        {entry.remarks && ` · "${entry.remarks}"`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
