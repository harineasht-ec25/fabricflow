import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const KPI = ({ label, value, color, sub }) => (
  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'14px 16px' }}>
    <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:26, fontWeight:500, color: color || '#1e293b', lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{sub}</div>}
  </div>
);

const STAGES = ['cutting','stitching','button_attachment','checking_trimming','ironing','finished_stock'];
const STAGE_LABELS = { cutting:'Cutting', stitching:'Stitching', button_attachment:'Buttons', checking_trimming:'Checking', ironing:'Ironing', finished_stock:'Finished' };
const STAGE_COLORS = { cutting:'#7c3aed', stitching:'#1a56db', button_attachment:'#d97706', checking_trimming:'#0d9488', ironing:'#dc2626', finished_stock:'#16a34a' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, ord, mon] = await Promise.all([
          api.get('/orders/meta/dashboard'),
          api.get('/orders?limit=6'),
          api.get('/reports/monthly'),
        ]);
        setStats(dash.data);
        setOrders(ord.data.orders || []);
        setMonthly(mon.data.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>Loading dashboard...</div>;

  const monthlyChart = {
    labels: monthly.map(d => new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })),
    datasets: [{
      label: 'Completed', data: monthly.map(d => parseInt(d.completed) || 0),
      borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,.1)', fill: true, tension: 0.35, pointRadius: 3,
    }]
  };

  const statusColors = { in_progress:'#1a56db', completed:'#16a34a', delayed:'#dc2626', cancelled:'#94a3b8' };
  const stagePill = (stage) => {
    const colors = { cutting:'#7c3aed', stitching:'#1a56db', button_attachment:'#d97706', checking_trimming:'#0d9488', ironing:'#dc2626', finished_stock:'#16a34a' };
    const bgs = { cutting:'#ede9fe', stitching:'#e8f0fe', button_attachment:'#fef3c7', checking_trimming:'#ccfbf1', ironing:'#fee2e2', finished_stock:'#dcfce7' };
    const c = colors[stage] || '#64748b';
    const bg = bgs[stage] || '#f1f5f9';
    return <span style={{ background:bg, color:c, padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500 }}>{STAGE_LABELS[stage] || stage}</span>;
  };

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        <KPI label="Today's Production" value={(stats?.today_production || 0).toLocaleString()} color="#1a56db" sub="pcs across stages" />
        <KPI label="Total Orders" value={(stats?.total_orders || 0).toLocaleString()} sub="this month" />
        <KPI label="In Progress" value={(stats?.in_progress || 0).toLocaleString()} color="#d97706" sub="active batches" />
        <KPI label="Completed" value={(stats?.completed || 0).toLocaleString()} color="#16a34a" sub="orders done" />
        <KPI label="Delayed" value={(stats?.delayed_orders || 0).toLocaleString()} color="#dc2626" sub="need attention" />
        <KPI label="Stock Ready" value={(stats?.total_completed_qty || 0).toLocaleString()} color="#0d9488" sub="pcs finished" />
      </div>

      {/* Stage WIP */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#64748b', marginBottom:12 }}>Stage-wise work in progress</div>
        <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
          {STAGES.map((s, i) => {
            const wip = stats?.wip_by_stage?.[s];
            return (
              <div key={s} style={{ flex:1, minWidth:110, padding:'10px 12px', background: wip ? '#f8faff' : '#fff', border:'0.5px solid rgba(0,0,0,0.07)', borderLeft: i > 0 ? 'none' : '', borderRadius: i === 0 ? '8px 0 0 8px' : i === STAGES.length-1 ? '0 8px 8px 0' : 0, position:'relative' }}>
                <div style={{ fontSize:10, color:'#64748b', marginBottom:4 }}>{STAGE_LABELS[s]}</div>
                <div style={{ fontSize:18, fontWeight:500, color: STAGE_COLORS[s] }}>{(wip?.count || 0)}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{wip?.qty ? `${parseInt(wip.qty).toLocaleString()} pcs` : 'no batches'}</div>
                <div style={{ height:4, background:'#e8eef4', borderRadius:2, marginTop:8, overflow:'hidden' }}>
                  <div style={{ height:'100%', background: STAGE_COLORS[s], width: wip ? `${Math.min(100, (wip.count / (stats.in_progress || 1)) * 100)}%` : '0%', borderRadius:2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Monthly production</div>
          <div style={{ height:200, position:'relative' }}>
            <Line data={monthlyChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ x:{ ticks:{ color:'#64748b', font:{ size:11 }}}, y:{ ticks:{ color:'#64748b', font:{ size:11 }}}}}} />
          </div>
        </div>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Orders by status</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:8 }}>
            {[['In Progress', stats?.in_progress, '#1a56db'], ['Completed', stats?.completed, '#16a34a'], ['Delayed', stats?.delayed_orders, '#dc2626']].map(([label, val, color]) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12 }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:500, color }}>{val || 0}</span>
                </div>
                <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:color, width:`${Math.min(100, ((val || 0) / (stats?.total_orders || 1)) * 100)}%`, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:500 }}>Recent orders</div>
          <a href="/orders" style={{ fontSize:12, color:'#1a56db', textDecoration:'none' }}>View all →</a>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Order','SKU','Customer','Style','Qty','Stage','Due','Priority'].map(h => (
                <th key={h} style={{ fontSize:11, fontWeight:500, color:'#64748b', textAlign:'left', padding:'6px 10px', borderBottom:'0.5px solid rgba(0,0,0,0.1)', whiteSpace:'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding:'8px 10px', fontSize:12, fontWeight:500 }}>{o.order_number}</td>
                  <td style={{ padding:'8px 10px', fontSize:12, color:'#1a56db' }}>{o.sku_id}</td>
                  <td style={{ padding:'8px 10px', fontSize:12 }}>{o.customer_name}</td>
                  <td style={{ padding:'8px 10px', fontSize:12 }}>{o.style_name}</td>
                  <td style={{ padding:'8px 10px', fontSize:12 }}>{o.quantity?.toLocaleString()}</td>
                  <td style={{ padding:'8px 10px' }}>{stagePill(o.current_stage)}</td>
                  <td style={{ padding:'8px 10px', fontSize:12, color: new Date(o.due_date) < new Date() ? '#dc2626' : '#64748b' }}>
                    {new Date(o.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                  </td>
                  <td style={{ padding:'8px 10px', fontSize:12, fontWeight:500, color: o.priority==='high'?'#dc2626':o.priority==='medium'?'#d97706':'#16a34a' }}>
                    {o.priority?.charAt(0).toUpperCase() + o.priority?.slice(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
