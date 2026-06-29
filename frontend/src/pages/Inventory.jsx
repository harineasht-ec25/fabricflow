import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const CAT_CONFIG = {
  raw_fabric:     { label:'Raw Fabric',        icon:'🧶', color:'#7c3aed', bg:'#ede9fe' },
  finished_goods: { label:'Finished Goods',    icon:'👕', color:'#16a34a', bg:'#dcfce7' },
  ready_dispatch: { label:'Ready to Dispatch', icon:'🚚', color:'#d97706', bg:'#fef3c7' },
  reserved:       { label:'Reserved Stock',    icon:'🔒', color:'#1a56db', bg:'#e8f0fe' },
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMovement, setShowMovement] = useState(null); // item id
  const [itemForm, setItemForm] = useState({ item_name:'', category:'raw_fabric', quantity:'', unit:'metres', min_stock:'' });
  const [movForm, setMovForm] = useState({ movement_type:'in', quantity:'', reference:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, mov] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/movements'),
      ]);
      setItems(inv.data);
      setMovements(mov.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const saveItem = async () => {
    setSaving(true);
    try {
      await api.post('/inventory', { ...itemForm, quantity: parseFloat(itemForm.quantity), min_stock: parseFloat(itemForm.min_stock) || 0 });
      toast.success('Item added!');
      setShowAddItem(false);
      setItemForm({ item_name:'', category:'raw_fabric', quantity:'', unit:'metres', min_stock:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveMovement = async () => {
    setSaving(true);
    try {
      await api.post(`/inventory/${showMovement}/movement`, { ...movForm, quantity: parseFloat(movForm.quantity) });
      toast.success('Movement recorded!');
      setShowMovement(null);
      setMovForm({ movement_type:'in', quantity:'', reference:'', notes:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  // Group by category
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  const summaryByCategory = {};
  items.forEach(item => {
    if (!summaryByCategory[item.category]) summaryByCategory[item.category] = 0;
    summaryByCategory[item.category] += parseFloat(item.quantity) || 0;
  });

  const movTypeColors = { in:'#16a34a', out:'#dc2626', transfer:'#1a56db', damage:'#d97706', adjustment:'#7c3aed' };
  const movTypeBgs = { in:'#dcfce7', out:'#fee2e2', transfer:'#e8f0fe', damage:'#fef3c7', adjustment:'#ede9fe' };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {Object.entries(CAT_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:16 }}>
            <div style={{ width:38, height:38, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:10 }}>{cfg.icon}</div>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{cfg.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color: cfg.color }}>{(summaryByCategory[key] || 0).toLocaleString()}</div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{grouped[key]?.length || 0} item(s)</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
        {/* Inventory table */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>Stock items</div>
            <button onClick={() => setShowAddItem(true)}
              style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer' }}>
              + Add item
            </button>
          </div>
          {Object.entries(CAT_CONFIG).map(([catKey, cfg]) => {
            const catItems = grouped[catKey] || [];
            if (!catItems.length) return null;
            return (
              <div key={catKey} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', background: cfg.bg, display:'flex', alignItems:'center', gap:8 }}>
                  <span>{cfg.icon}</span>
                  <span style={{ fontSize:12, fontWeight:500, color: cfg.color }}>{cfg.label}</span>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    {['Item','Qty','Unit','Min Stock','Status','Action'].map(h => (
                      <th key={h} style={{ fontSize:10, fontWeight:500, color:'#94a3b8', textAlign:'left', padding:'7px 12px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {catItems.map(item => {
                      const isLow = parseFloat(item.quantity) <= parseFloat(item.min_stock) && item.min_stock > 0;
                      return (
                        <tr key={item.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding:'8px 12px', fontSize:12, fontWeight:500 }}>{item.item_name}</td>
                          <td style={{ padding:'8px 12px', fontSize:12, color: isLow ? '#dc2626' : '#1e293b', fontWeight: isLow ? 600 : 400 }}>{parseFloat(item.quantity).toLocaleString()}</td>
                          <td style={{ padding:'8px 12px', fontSize:12, color:'#64748b' }}>{item.unit}</td>
                          <td style={{ padding:'8px 12px', fontSize:12, color:'#94a3b8' }}>{item.min_stock || '—'}</td>
                          <td style={{ padding:'8px 12px' }}>
                            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background: isLow ? '#fee2e2' : '#dcfce7', color: isLow ? '#dc2626' : '#16a34a', fontWeight:500 }}>
                              {isLow ? '⚠ Low' : 'OK'}
                            </span>
                          </td>
                          <td style={{ padding:'8px 12px' }}>
                            <button onClick={() => setShowMovement(item.id)}
                              style={{ padding:'3px 8px', borderRadius:6, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:11, cursor:'pointer' }}>
                              + Move
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Movement log */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Recent movements</div>
          {loading ? (
            <div style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>Loading...</div>
          ) : movements.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>No movements yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {movements.slice(0, 20).map((m, i) => (
                <div key={m.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < movements.length-1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: movTypeBgs[m.movement_type] || '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                    {m.movement_type === 'in' ? '⬆' : m.movement_type === 'out' ? '⬇' : m.movement_type === 'damage' ? '⚠' : '↔'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.item_name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      {new Date(m.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })} · {m.created_by_name || 'System'}
                      {m.reference && ` · ${m.reference}`}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color: movTypeColors[m.movement_type] }}>
                      {m.movement_type === 'in' ? '+' : m.movement_type === 'out' ? '-' : ''}{parseFloat(m.quantity).toLocaleString()}
                    </div>
                    <div style={{ fontSize:10, color:'#94a3b8' }}>{m.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>Add inventory item</div>
              <button onClick={() => setShowAddItem(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[['Item Name','item_name','text'],['Quantity','quantity','number'],['Min Stock Alert','min_stock','number']].map(([label,name,type]) => (
                <div key={name}>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>{label}</label>
                  <input type={type} value={itemForm[name]} onChange={e => setItemForm(f => ({ ...f, [name]: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Category</label>
                <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, background:'#fff' }}>
                  {Object.entries(CAT_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Unit</label>
                <select value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, background:'#fff' }}>
                  {['metres','pcs','kg','rolls','boxes'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button onClick={() => setShowAddItem(false)} style={{ flex:1, padding:'10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
                <button onClick={saveItem} disabled={saving} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                  {saving ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovement && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>Record movement</div>
              <button onClick={() => setShowMovement(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>Movement type</label>
                <select value={movForm.movement_type} onChange={e => setMovForm(f => ({ ...f, movement_type: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, background:'#fff' }}>
                  <option value="in">IN — Stock received</option>
                  <option value="out">OUT — Stock dispatched</option>
                  <option value="transfer">TRANSFER — Stage transfer</option>
                  <option value="damage">DAMAGE — Write-off</option>
                  <option value="adjustment">ADJUSTMENT — Manual correction</option>
                </select>
              </div>
              {[['Quantity *','quantity','number'],['Reference (PO/Order #)','reference','text'],['Notes','notes','text']].map(([label,name,type]) => (
                <div key={name}>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#64748b', marginBottom:5 }}>{label}</label>
                  <input type={type} value={movForm[name]} onChange={e => setMovForm(f => ({ ...f, [name]: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ display:'flex', gap:10, marginTop:6 }}>
                <button onClick={() => setShowMovement(null)} style={{ flex:1, padding:'10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
                <button onClick={saveMovement} disabled={saving} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                  {saving ? 'Saving...' : 'Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
