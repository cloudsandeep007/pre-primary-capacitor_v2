import os
import re

# 1. Update AdminFinanceView.tsx
finance_path = r'src/pages/admin/AdminFinanceView.tsx'
with open(finance_path, 'r', encoding='utf-8') as f:
    finance_code = f.read()

# Add timeFilter state
finance_code = finance_code.replace(
    "const [activeYear, setActiveYear] = useState<string>('2026-2027');",
    "const [activeYear, setActiveYear] = useState<string>('2026-2027');\n  const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('year');"
)

# Replace KPIs with filtered logic
kpi_target = """  const totalExpected = ledgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const totalCollected = ledgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalPending = ledgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due - curr.amount_paid), 0);
  const totalDiscounts = ledgers.reduce((acc, curr) => acc + (curr.discount_amount || 0), 0);"""

kpi_replacement = """  const filteredLedgers = useMemo(() => {
    if (timeFilter === 'year') return ledgers;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return ledgers.filter(l => {
      if (!l.due_date) return l.fee_period !== 'Monthly'; 
      const d = new Date(l.due_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [ledgers, timeFilter]);

  const totalExpected = filteredLedgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const totalCollected = filteredLedgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalPending = filteredLedgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + ((curr.total_due || 0) - (curr.amount_paid || 0)), 0);
  const totalDiscounts = filteredLedgers.reduce((acc, curr) => acc + (curr.discount_amount || 0), 0);"""

finance_code = finance_code.replace(kpi_target, kpi_replacement)

# Add UI toggle
toggle_target = """        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">"""

toggle_replacement = """        <>
          <div className="flex justify-end mb-2">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setTimeFilter('month')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeFilter === 'month' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Current Month
              </button>
              <button
                onClick={() => setTimeFilter('year')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${timeFilter === 'year' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Full Year
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">"""

finance_code = finance_code.replace(toggle_target, toggle_replacement)

with open(finance_path, 'w', encoding='utf-8') as f:
    f.write(finance_code)

# 2. Update AdminDashboardOverview.tsx
dash_path = r'src/pages/admin/AdminDashboardOverview.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_code = f.read()

# Add financeTimeFilter state
dash_code = dash_code.replace(
    "const [ledgers, setLedgers] = useState<StudentFee[]>([]);",
    "const [ledgers, setLedgers] = useState<StudentFee[]>([]);\n  const [financeTimeFilter, setFinanceTimeFilter] = useState<'month'|'year'>('month');"
)

# Update KPIs to safely prevent NaN
dash_target = """  // --- Finance Metrics (LIVE) ---
  const feeExpected = ledgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const feePaidLive = ledgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const feePendingLive = ledgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due - curr.amount_paid), 0);"""

dash_replacement = """  // --- Finance Metrics (LIVE) ---
  const currentYear = new Date().getFullYear();
  
  const filteredLedgers = useMemo(() => {
    if (financeTimeFilter === 'year') return ledgers;
    return ledgers.filter(l => {
      if (!l.due_date) return l.fee_period !== 'Monthly'; 
      const d = new Date(l.due_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [ledgers, financeTimeFilter]);

  const feeExpected = filteredLedgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const feePaidLive = filteredLedgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const feePendingLive = filteredLedgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + ((curr.total_due || 0) - (curr.amount_paid || 0)), 0);"""

dash_code = dash_code.replace(dash_target, dash_replacement)

# Add classWiseFeeData
classwise_target = """  const feePieData = [
    { name: 'Collected', value: feePaidLive, color: '#10b981' },
    { name: 'Pending', value: feePendingLive, color: '#f43f5e' }
  ];"""

classwise_replacement = """  const feePieData = [
    { name: 'Collected', value: feePaidLive || 0, color: '#10b981' },
    { name: 'Pending', value: feePendingLive || 0, color: '#f43f5e' }
  ];

  // Class-wise fee calculation
  const classFeeMap: Record<string, { cls: string; paid: number; pending: number }> = {};
  filteredLedgers.forEach(l => {
    if (l.status === 'Waived') return;
    const cls = l.student?.class_name || 'Unknown';
    if (!classFeeMap[cls]) classFeeMap[cls] = { cls, paid: 0, pending: 0 };
    classFeeMap[cls].paid += (l.amount_paid || 0);
    classFeeMap[cls].pending += ((l.total_due || 0) - (l.amount_paid || 0));
  });
  const classWiseFeeData = Object.values(classFeeMap).sort((a, b) => a.cls.localeCompare(b.cls));"""

dash_code = dash_code.replace(classwise_target, classwise_replacement)

# Add toggle to Widget
widget_target = """        {/* Fee Collection Status Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div className="flex items-center gap-2 mb-3 text-slate-500">
            <DollarSign size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-700">Fee Collection</h3>
          </div>"""

widget_replacement = """        {/* Fee Collection Status Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-700">Fee Collection</h3>
            </div>
            <select 
              value={financeTimeFilter}
              onChange={(e) => setFinanceTimeFilter(e.target.value as 'month' | 'year')}
              className="text-xs bg-slate-100 rounded-lg px-2 py-1 text-slate-600 font-medium outline-none border-none cursor-pointer"
            >
              <option value="month">Monthly</option>
              <option value="year">Annual</option>
            </select>
          </div>"""

dash_code = dash_code.replace(widget_target, widget_replacement)

# Insert Class-wise chart row
chart_target = """      </div>

      {/* Bottom Row: Admissions Trend & Upcoming Events */}"""

chart_replacement = """      </div>

      {/* Finance Class-wise Insight Row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-base font-bold text-slate-700">Class-wise Fee Collection ({financeTimeFilter === 'month' ? 'Current Month' : 'Full Year'})</h3>
        </div>
        <div className="w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classWiseFeeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="cls" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="paid" stackId="a" fill="#10b981" name="Collected (₹)" radius={[0, 0, 4, 4]} maxBarSize={50} />
              <Bar dataKey="pending" stackId="a" fill="#f43f5e" name="Pending (₹)" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Admissions Trend & Upcoming Events */}"""

dash_code = dash_code.replace(chart_target, chart_replacement)

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_code)

print("SUCCESS")
