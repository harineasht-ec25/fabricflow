import { useState, useEffect, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const STAGE_CONFIG = {
  cutting:          { label:'Cutting',                icon:'✂️',  color:'#7c3aed', bg:'#ede9fe', key:'cutting' },
  stitching:        { label:'Stitching',              icon:'🧵',  color:'#1a56db', bg:'#e8f0fe', key:'stitching' },
  buttons:          { label:'Button Attachment',      icon:'🔘',  color:'#d97706', bg:'#fef3c7', key:'button_attachment' },
  checking:         { label:'Checking & Trimming',    icon:'✅',  color:'#0d9488', bg:'#ccfbf1', key:'checking_trimming' },
  ironing:          { label:'Ironing',                icon:'🧺',  color:'#dc2626', bg:'#fee2e2', key:'ironing' },
  stock:            { label:'Finished Stock',         icon:'📦',  color:'#16a34a', bg:'#dcfce7', key:'finished_stock' },
};

export default function StagePage({ stage }) {
  const cfg = STAGE_CONFIG[stage];
  const skuRef = useRef(null);

  const [form, setForm] = useState({ sku_id:'', quantity_received:'', quantity_completed:'', quantity_rejected:'0', remarks:'' });
  const [skuInfo, setSkuInfo] = useState(null);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    loadEntries();
    skuRef.current?.focus();
  }, [stage]);

  const loadEntries = async () => {
    setLoadingEntries(true);
    try {
      const { data } = await api.get(`/stages/stage/${cfg.key}`);
      setEntries(data);
    } catch {} finally { setLoadingEntries(false); }
  };

  const lookupSKU = async (sku) => {
    if (!sku || sku.length < 3) { setSkuInfo(null); return; }
    try {
      const { data } = await api.get(`/orders/${sku}`);
      setSkuInfo(data);
      setForm(f => ({ ...f, quantity_received: data.quantity?.toString() || '' }));
    } catch { setSkuInfo(null); }
  };

  const submit = async () => {
    if (!form.sku_id || !form.quantity_received || !form.quantity_completed) {
      return toast.error('Fill all required fields');
    }
    setSubmitting(true);
    try {
      await api.post('/stages', {
        sku_id: form.sku_id.toUpperCase(),
        stage: cfg.key,
        quantity_received: parseInt(form.quantity_received),
        quantity_completed: parseInt(form.quantity_completed),
        quantity_rejected: parseInt(form.quantity_rejected) || 0,
        remarks: form.remarks,
      });
      toast.success('Stage entry saved!');
      setForm({ sku_id:'', quantity_received:'', quantity_completed:'', quantity_rejected:'0', remarks:'' });
      setSkuInfo(null);
      loadEntries();
      skuRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const markComplete = async (entryId) => {
    setCompleting(entryId);
    try {
      const { data } = await api.post(`/stages/${entryId}/complete`);
      toast.success(`Stage completed! Moved to ${data.next_stage?.replace(/_/g,' ') || 'finished stock'}`);
      loadEntries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setCompleting(null); }
  };

  const rejPct = form.quantity_received && form.quantity_rejected
    ? ((parseInt(form.quantity_rejected) / parseInt(form.quantity_received)) * 100).toFixed(1)
    : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ background: cfg.color, color:'#fff', borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:32 }}>{cfg.icon}</span>
        <div>
          <div style={{ fontSize:17, fontWeight:600 }}>{cfg.label} — Stage Entry</div>
          <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>Enter quantity details · mark complete to advance the batch</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Entry form */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:16 }}>New entry</div>

          {/* SKU lookup */}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>SKU ID *</label>
            <input ref={skuRef} value={form.sku_id}
              onChange={e => { setForm(f => ({ ...f, sku_id: e.target.value })); lookupSKU(e.target.value.toUpperCase()); }}
              placeholder="Scan barcode or type SKU..."
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`0.5px solid ${skuInfo ? cfg.color : 'rgba(0,0,0,0.2)'}`, fontSize:13, boxSizing:'border-box' }} />
            {skuInfo && (
              <div style={{ marginTop:8, padding:'8px 12px', background: cfg.bg, borderRadius:8, fontSize:12 }}>
                <strong style={{ color: cfg.color }}>{skuInfo.sku_id}</strong> — {skuInfo.style_name} · {skuInfo.color} · {skuInfo.size}<br />
                <span style={{ color:'#64748b' }}>Customer: {skuInfo.customer_name} · Order qty: {skuInfo.quantity?.toLocaleString()} · Due: {new Date(skuInfo.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            {[['Qty Received *','quantity_received'],['Qty Completed *','quantity_completed']].map(([label, name]) => (
              <div key={name}>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>{label}</label>
                <input type="number" min="0" value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, boxSizing:'border-box' }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>
              Rejected / Damaged
              {rejPct > 5 && <span style={{ marginLeft:8, color:'#dc2626', fontWeight:600 }}>⚠ {rejPct}% — exceeds limit!</span>}
            </label>
            <input type="number" min="0" value={form.quantity_rejected} onChange={e => setForm(f => ({ ...f, quantity_rejected: e.target.value }))}
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`0.5px solid ${rejPct > 5 ? '#dc2626' : 'rgba(0,0,0,0.2)'}`, fontSize:13, boxSizing:'border-box' }} />
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Remarks</label>
            <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Any issues, notes, or delays..."
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, minHeight:70, resize:'vertical', boxSizing:'border-box' }} />
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setForm({ sku_id:'', quantity_received:'', quantity_completed:'', quantity_rejected:'0', remarks:'' }); setSkuInfo(null); }}
              style={{ flex:1, padding:'10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:13, cursor:'pointer' }}>
              Clear
            </button>
            <button onClick={submit} disabled={submitting}
              style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background: cfg.color, color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
              {submitting ? 'Saving...' : '💾 Save Entry'}
            </button>
          </div>
        </div>

        {/* Today's entries */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Today's entries</div>
          {loadingEntries ? (
            <div style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>Loading...</div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>No entries today</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['SKU','In','Done','Rej','Time','Status','Action'].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:500, color:'#94a3b8', textAlign:'left', padding:'5px 8px', borderBottom:'0.5px solid rgba(0,0,0,0.08)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding:'7px 8px', fontSize:12, color: cfg.color, fontWeight:500 }}>{e.sku_id}</td>
                      <td style={{ padding:'7px 8px', fontSize:12 }}>{e.quantity_received?.toLocaleString()}</td>
                      <td style={{ padding:'7px 8px', fontSize:12 }}>{e.quantity_completed?.toLocaleString()}</td>
                      <td style={{ padding:'7px 8px', fontSize:12, color: e.quantity_rejected > 0 ? '#dc2626' : '#94a3b8' }}>{e.quantity_rejected || 0}</td>
                      <td style={{ padding:'7px 8px', fontSize:11, color:'#94a3b8' }}>
                        {new Date(e.created_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td style={{ padding:'7px 8px' }}>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background: e.is_completed ? '#dcfce7' : '#fef3c7', color: e.is_completed ? '#16a34a' : '#d97706', fontWeight:500 }}>
                          {e.is_completed ? 'Done' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding:'7px 8px' }}>
                        {!e.is_completed && (
                          <button onClick={() => markComplete(e.id)} disabled={completing === e.id}
                            style={{ padding:'3px 8px', borderRadius:6, border:'none', background: cfg.color, color:'#fff', fontSize:10, cursor:'pointer', fontWeight:500 }}>
                            {completing === e.id ? '...' : '✓ Complete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {entries.length > 0 && (
            <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                ['Total In', entries.reduce((s,e) => s + (e.quantity_received||0), 0).toLocaleString(), '#1a56db'],
                ['Total Done', entries.reduce((s,e) => s + (e.quantity_completed||0), 0).toLocaleString(), cfg.color],
                ['Total Rej', entries.reduce((s,e) => s + (e.quantity_rejected||0), 0).toLocaleString(), '#dc2626'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{label}</div>
                  <div style={{ fontSize:16, fontWeight:500, color }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
