import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js';
import api from '../api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

const CHART_OPTS = (gridColor = 'rgba(0,0,0,0.06)', tickColor = '#64748b') => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor } }, y: { ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor } } }
});

export default function Reports() {
  const [type, setType] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [skuReport, setSkuReport] = useState([]);
  const [customerReport, setCustomerReport] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, m, s, c] = await Promise.all([
        api.get(`/reports/daily?date=${date}`),
        api.get('/reports/monthly'),
        api.get('/reports/sku'),
        api.get('/reports/customer'),
      ]);
      setDaily(d.data.entries || []);
      setMonthly(m.data.data || []);
      setSkuReport(s.data || []);
      setCustomerReport(c.data || []);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const exportExcel = async () => {
    try {
      const res = await api.get('/reports/export/excel?type=orders', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `fabricflow-${type}-${date}.xlsx`; a.click();
      toast.success('Excel downloaded!');
    } catch { toast.error('Export failed'); }
  };

  const totalCompleted = daily.reduce((s, r) => s + (parseInt(r.completed) || 0), 0);
  const totalRejected = daily.reduce((s, r) => s + (parseInt(r.rejected) || 0), 0);
  const efficiency = totalCompleted + totalRejected > 0
    ? Math.round((totalCompleted / (totalCompleted + totalRejected)) * 100) : 0;

  const monthlyChart = {
    labels: monthly.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
    datasets: [{
      label: 'Completed', data: monthly.map(d => parseInt(d.completed) || 0),
      borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,.1)', fill: true, tension: 0.35, pointRadius: 3,
    }, {
      label: 'Rejected', data: monthly.map(d => parseInt(d.rejected) || 0),
      borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.05)', fill: false, tension: 0.35, pointRadius: 3,
    }]
  };

  const stageRejChart = {
    labels: daily.map(d => d.stage?.replace(/_/g, ' ')),
    datasets: [{ label: 'Rejected', data: daily.map(d => parseInt(d.rejected) || 0), backgroundColor: ['rgba(124,58,237,.7)', 'rgba(26,86,219,.7)', 'rgba(217,119,6,.7)', 'rgba(13,148,136,.7)', 'rgba(220,38,38,.7)', 'rgba(22,163,74,.7)'], borderRadius: 4 }]
  };

  const STAGE_LABELS = { cutting: 'Cutting', stitching: 'Stitching', button_attachment: 'Buttons', checking_trimming: 'Checking', ironing: 'Ironing', finished_stock: 'Finished' };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13, background: '#fff' }}>
          <option value="daily">Daily Report</option>
          <option value="monthly">Monthly Report</option>
          <option value="sku">SKU-wise</option>
          <option value="customer">Customer-wise</option>
        </select>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); loadAll(); }}
          style={{ padding: '8px 10px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 13, background: '#fff' }} />
        <button onClick={loadAll} style={{ padding: '8px 14px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', fontSize: 13, cursor: 'pointer' }}>🔄 Refresh</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={exportExcel} style={{ padding: '8px 14px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', fontSize: 12, cursor: 'pointer' }}>📊 Export Excel</button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          ['Total Produced', totalCompleted.toLocaleString(), '#1a56db'],
          ['Total Rejected', totalRejected.toLocaleString(), '#dc2626'],
          ['Efficiency', `${efficiency}%`, efficiency >= 90 ? '#16a34a' : efficiency >= 75 ? '#d97706' : '#dc2626'],
          ['SKUs Processed', daily.reduce((s, r) => s + (parseInt(r.skus_processed) || 0), 0), '#7c3aed'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Monthly production trend</div>
          <div style={{ height: 200, position: 'relative' }}>
            <Line data={monthlyChart} options={{ ...CHART_OPTS(), plugins: { legend: { display: true, labels: { font: { size: 11 }, color: '#64748b' } } } }} />
          </div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Rejections by stage (today)</div>
          <div style={{ height: 200, position: 'relative' }}>
            {daily.length > 0
              ? <Bar data={stageRejChart} options={CHART_OPTS()} />
              : <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 13 }}>No rejection data today</div>}
          </div>
        </div>
      </div>

      {/* Daily stage table */}
      {type === 'daily' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 500 }}>Stage-wise performance — {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Stage', 'Operator', 'Received', 'Completed', 'Rejected', 'Rej %', 'Efficiency'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textAlign: 'left', padding: '8px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Loading...</td></tr>
                  : daily.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No data for this date</td></tr>
                    : daily.map((r, i) => {
                      const rej = parseInt(r.rejected) || 0;
                      const rec = parseInt(r.received) || 0;
                      const comp = parseInt(r.completed) || 0;
                      const rejPct = rec > 0 ? ((rej / rec) * 100).toFixed(1) : 0;
                      const eff = rec > 0 ? Math.round((comp / rec) * 100) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>{STAGE_LABELS[r.stage] || r.stage}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#64748b' }}>{r.operator_name || '—'}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12 }}>{rec.toLocaleString()}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12 }}>{comp.toLocaleString()}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: rej > 0 ? '#dc2626' : '#94a3b8' }}>{rej.toLocaleString()}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: rejPct > 5 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{rejPct}%</td>
                          <td style={{ padding: '9px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ height: '100%', background: eff >= 90 ? '#16a34a' : eff >= 75 ? '#d97706' : '#dc2626', width: `${eff}%`, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 500, color: eff >= 90 ? '#16a34a' : eff >= 75 ? '#d97706' : '#dc2626' }}>{eff}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SKU report */}
      {type === 'sku' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12 }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 500 }}>SKU-wise production report</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['SKU ID', 'Order #', 'Style', 'Customer', 'Qty', 'Stage', 'Rejected', 'Stages Done', 'Due', 'Priority'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textAlign: 'left', padding: '8px 12px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {skuReport.map(r => (
                  <tr key={r.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#1a56db', fontWeight: 500 }}>{r.sku_id}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.order_number}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.style_name}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.customer_name}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.quantity?.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11 }}>{STAGE_LABELS[r.current_stage] || r.current_stage}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: r.total_rejected > 0 ? '#dc2626' : '#94a3b8' }}>{r.total_rejected || 0}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{r.stages_completed || 0} / 6</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: new Date(r.due_date) < new Date() && r.status !== 'completed' ? '#dc2626' : '#64748b' }}>
                      {new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, color: r.priority === 'high' ? '#dc2626' : r.priority === 'medium' ? '#d97706' : '#16a34a' }}>
                      {r.priority?.charAt(0).toUpperCase() + r.priority?.slice(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer report */}
      {type === 'customer' && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12 }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 500 }}>Customer-wise order report</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Customer', 'Total Orders', 'Total Qty', 'Completed', 'In Progress', 'Delayed'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textAlign: 'left', padding: '8px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {customerReport.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>{r.customer_name}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>{r.total_orders}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>{parseInt(r.total_quantity)?.toLocaleString()}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: '#16a34a', fontWeight: 500 }}>{r.completed}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: '#1a56db' }}>{r.in_progress}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: r.delayed > 0 ? '#dc2626' : '#94a3b8', fontWeight: r.delayed > 0 ? 500 : 400 }}>{r.delayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
