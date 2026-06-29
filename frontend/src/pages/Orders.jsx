import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const STAGE_LABELS = { cutting:'Cutting', stitching:'Stitching', button_attachment:'Buttons', checking_trimming:'Checking', ironing:'Ironing', finished_stock:'Finished' };
const STAGE_COLORS = { cutting:'#7c3aed', stitching:'#1a56db', button_attachment:'#d97706', checking_trimming:'#0d9488', ironing:'#dc2626', finished_stock:'#16a34a' };
const STAGE_BGS = { cutting:'#ede9fe', stitching:'#e8f0fe', button_attachment:'#fef3c7', checking_trimming:'#ccfbf1', ironing:'#fee2e2', finished_stock:'#dcfce7' };

const emptyOrder = { order_number:'', sku_id:'', style_name:'', product_name:'', color:'', size:'', customer_name:'', quantity:'', production_date:'', due_date:'', priority:'medium', remarks:'' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stage) params.set('stage', stage);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, stage, status, priority]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/orders', { ...form, quantity: parseInt(form.quantity) });
      toast.success('Order created!');
      setShowModal(false);
      setForm(emptyOrder);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/export/excel?type=orders', { responseType:'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'orders.xlsx'; a.click();
    } catch { toast.error('Export failed'); }
  };

  const F = ({ label, name, type='text', options, maxLength }) => {
    const val = form[name] || '';
    const nearLimit = maxLength && val.length >= maxLength - 5;
    const atLimit = maxLength && val.length >= maxLength;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <label style={{ fontSize:12, fontWeight:500, color:'#64748b' }}>{label}</label>
          {maxLength && (
            <span style={{ fontSize:11, fontWeight:500, color: atLimit ? '#dc2626' : nearLimit ? '#d97706' : '#94a3b8' }}>
              {val.length}/{maxLength}
            </span>
          )}
        </div>
        {options ? (
          <select value={val} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
            style={{ padding:'8px 10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, background:'#fff' }}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type} value={val} maxLength={maxLength}
            onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
            style={{ padding:'8px 10px', borderRadius:8, border:`0.5px solid ${atLimit ? '#dc2626' : nearLimit ? '#d97706' : 'rgba(0,0,0,0.2)'}`, fontSize:13 }} />
        )}
        {atLimit && (
          <span style={{ fontSize:11, color:'#dc2626' }}>Maximum 50 characters reached</span>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU, order, customer..."
          style={{ padding:'8px 12px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', fontSize:13, width:220, background:'#fff' }} />
        <select value={stage} onChange={e => setStage(e.target.value)}
          style={{ padding:'8px 10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', fontSize:12, background:'#fff' }}>
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding:'8px 10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', fontSize:12, background:'#fff' }}>
          <option value="">All status</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)}
          style={{ padding:'8px 10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', fontSize:12, background:'#fff' }}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={exportExcel} style={{ padding:'8px 14px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', fontSize:12, background:'#fff', cursor:'pointer' }}>📊 Excel</button>
          <button onClick={() => setShowModal(true)} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer' }}>+ New Order</button>
        </div>
      </div>

      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12 }}>
        <div style={{ padding:'12px 16px', borderBottom:'0.5px solid rgba(0,0,0,0.07)', fontSize:12, color:'#64748b' }}>
          {total} orders found
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Order #','SKU ID','Style','Product','Color','Size','Customer','Qty','Stage','Due','Priority','Actions'].map(h => (
                <th key={h} style={{ fontSize:11, fontWeight:500, color:'#64748b', textAlign:'left', padding:'8px 12px', borderBottom:'0.5px solid rgba(0,0,0,0.08)', whiteSpace:'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>No orders found</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding:'9px 12px', fontSize:12, fontWeight:500 }}>{o.order_number}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, color:'#1a56db', fontWeight:500, cursor:'pointer' }} onClick={() => navigate(`/sku?q=${o.sku_id}`)}>{o.sku_id}</td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}>{o.style_name}</td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}>{o.product_name}</td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}><span style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:20, fontSize:11 }}>{o.color}</span></td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}>{o.size}</td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}>{o.customer_name}</td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}>{o.quantity?.toLocaleString()}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{ background: STAGE_BGS[o.current_stage] || '#f1f5f9', color: STAGE_COLORS[o.current_stage] || '#64748b', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500 }}>
                      {STAGE_LABELS[o.current_stage] || o.current_stage}
                    </span>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12, color: new Date(o.due_date) < new Date() && o.status !== 'completed' ? '#dc2626' : '#64748b' }}>
                    {new Date(o.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12, fontWeight:500, color: o.priority==='high'?'#dc2626':o.priority==='medium'?'#d97706':'#16a34a' }}>
                    {o.priority?.charAt(0).toUpperCase() + o.priority?.slice(1)}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <button onClick={() => navigate(`/sku?q=${o.sku_id}`)} style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:11, cursor:'pointer' }}>Track</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:600 }}>New Production Order</div>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <F label="Order Number *" name="order_number" />
              <F label="SKU ID *" name="sku_id" maxLength={50} />
              <F label="Style Name *" name="style_name" />
              <F label="Product Name *" name="product_name" />
              <F label="Color *" name="color" />
              <F label="Size *" name="size" options={[{value:'XS',label:'XS'},{value:'S',label:'S'},{value:'M',label:'M'},{value:'L',label:'L'},{value:'XL',label:'XL'},{value:'XXL',label:'XXL'}]} />
              <F label="Customer Name *" name="customer_name" />
              <F label="Quantity *" name="quantity" type="number" />
              <F label="Production Date *" name="production_date" type="date" />
              <F label="Due Date *" name="due_date" type="date" />
              <F label="Priority" name="priority" options={[{value:'high',label:'High'},{value:'medium',label:'Medium'},{value:'low',label:'Low'}]} />
              <div />
              <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'#64748b' }}>Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  style={{ padding:'8px 10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.2)', fontSize:13, minHeight:70, resize:'vertical' }} />
              </div>
              <div style={{ gridColumn:'1/-1', display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
                <button onClick={() => setShowModal(false)} style={{ padding:'9px 18px', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#1a56db', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                  {saving ? 'Saving...' : 'Create Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
