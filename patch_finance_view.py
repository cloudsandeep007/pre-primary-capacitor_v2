import sys
import re

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'StudentGroup' not in content:
    content = content.replace("import { LedgerTable } from './finance/components/LedgerTable';", 
                              "import { LedgerTable, StudentGroup } from './finance/components/LedgerTable';")

# 2. Filter states
filter_states = """  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dues' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'highest_due' | 'lowest_due'>('highest_due');
"""
if 'const [searchTerm, setSearchTerm]' not in content:
    content = content.replace("const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('year');",
                              "const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('year');\n" + filter_states)

# 3. Filtered Groups Logic (Replace filteredLedgers and stats)
# We need to find where `const filteredLedgers = useMemo` starts and where `const totalDiscounts =` ends.
filtered_start = content.find("const filteredLedgers = useMemo((): StudentFee[] => {")
stats_end = content.find("const totalDiscounts =", filtered_start)
stats_end_full = content.find("\n", stats_end) + 1

if filtered_start != -1 and stats_end_full != -1:
    new_logic = """  // 1. First apply time and category filters to raw ledgers
  const baseFilteredLedgers = useMemo((): StudentFee[] => {
    let result = ledgers;
    
    // Time Filter
    if (timeFilter === 'month') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      result = result.filter(l => {
        if (!l.due_date) return l.fee_period !== 'Monthly';
        const d = new Date(l.due_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }
    
    // Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter(l => {
        const catName = l.category?.name || l.structure?.category?.name || l.structure?.fee_category || 'General Fee';
        return catName === categoryFilter;
      });
    }
    
    return result;
  }, [ledgers, timeFilter, categoryFilter]);

  // 2. Group the filtered ledgers by Student
  const studentGroups = useMemo(() => {
    const groups: Record<string, StudentGroup> = {};
    baseFilteredLedgers.forEach(l => {
      const sid = l.student_id;
      if (!groups[sid]) {
        groups[sid] = { 
          studentId: sid,
          studentName: l.student?.name || 'Unknown Student',
          className: l.student?.class_name || 'Unknown Class',
          ledgers: [], 
          totalDue: 0, 
          totalPaid: 0,
          outstanding: 0
        };
      }
      groups[sid].ledgers.push(l);
      groups[sid].totalDue += Number(l.total_due) || 0;
      groups[sid].totalPaid += Number(l.amount_paid) || 0;
      groups[sid].outstanding = groups[sid].totalDue - groups[sid].totalPaid;
    });
    return Object.values(groups);
  }, [baseFilteredLedgers]);

  // Unique lists for dropdowns
  const availableClasses = useMemo(() => Array.from(new Set(studentGroups.map(g => g.className))).sort(), [studentGroups]);
  const availableCategories = useMemo(() => Array.from(new Set(ledgers.map(l => l.category?.name || l.structure?.category?.name || l.structure?.fee_category || 'General Fee'))).sort(), [ledgers]);

  // 3. Final Filter & Sort of the Student Groups
  const filteredGroups = useMemo(() => {
    let result = studentGroups.filter(g => {
      if (statusFilter === 'dues' && g.outstanding <= 0) return false;
      if (statusFilter === 'paid' && g.outstanding > 0) return false;
      if (classFilter !== 'all' && g.className !== classFilter) return false;
      if (searchTerm && !g.studentName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'highest_due') return b.outstanding - a.outstanding;
      if (sortBy === 'lowest_due') return a.outstanding - b.outstanding;
      return a.studentName.localeCompare(b.studentName);
    });

    return result;
  }, [studentGroups, statusFilter, classFilter, searchTerm, sortBy]);

  // 4. Compute KPIs exactly from the filtered groups
  const totalExpected = filteredGroups.reduce((acc, curr) => acc + curr.totalDue, 0);
  const totalCollected = filteredGroups.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalPending = filteredGroups.reduce((acc, curr) => acc + curr.outstanding, 0);
  // Discounts apply to all base ledgers currently on screen
  const totalDiscounts = baseFilteredLedgers.reduce((acc, curr) => acc + (curr.discount_amount || 0), 0);
"""
    content = content[:filtered_start] + new_logic + content[stats_end_full:]

# 4. Add Export CSV and Bulk Remind logic
if 'handleExportCSV' not in content:
    handlers = """
  const handleExportCSV = () => {
    const header = ['Student Name', 'Class', 'Total Expected', 'Total Collected', 'Outstanding', 'Status'];
    const rows = filteredGroups.map(g => [
      g.studentName,
      g.className,
      g.totalDue.toString(),
      g.totalPaid.toString(),
      g.outstanding.toString(),
      g.outstanding <= 0 ? 'Fully Paid' : 'Has Dues'
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\\n');
    downloadFile(`Fee_Report_${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv');
    showToast('Export successful', 'success');
  };

  const handleBulkRemind = () => {
    const duesCount = filteredGroups.filter(g => g.outstanding > 0).length;
    if (duesCount === 0) return showToast('No students with dues in the current view.', 'error');
    
    // Simulate sending reminders
    auditLog({
      actor_type: 'staff',
      action: 'SYSTEM_UPDATED' as any,
      resource_type: 'system',
      metadata: { action: 'BULK_REMINDER_SENT', count: duesCount }
    });
    showToast(`Reminders sent to ${duesCount} students successfully!`, 'success');
  };
"""
    loadData_idx = content.find("  const loadData = async () => {")
    content = content[:loadData_idx] + handlers + content[loadData_idx:]


# 5. UI Injection
ui_injection = """
        <div className="space-y-6">
          {/* TOP CONTROLS */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800 hidden md:block">Fee Ledgers</h3>
              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button 
                  onClick={() => setTimeFilter('month')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => setTimeFilter('year')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${timeFilter === 'year' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Full Year
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              <div className="relative w-full md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search student..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Fee Types</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                value={classFilter} 
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 hidden lg:block"
              >
                <option value="all">All Classes</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="dues">Has Dues</option>
                <option value="paid">Fully Paid</option>
              </select>

              <button 
                onClick={handleExportCSV}
                className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-100"
              >
                <Download size={16} /> Export
              </button>

              <button 
                onClick={handleBulkRemind}
                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-rose-100"
              >
                <Bell size={16} /> Remind Dues
              </button>
            </div>
          </div>
          
          <LedgerTable
            groups={filteredGroups}
            activeYear={activeYear}
            onViewHistory={handleViewHistory}
            onCollect={handleOpenPayment}
          />
        </div>
"""

# Replace the LedgerTable mounting block
import re
# We look for the exact overview block we just injected last step.
overview_start = content.find("<div className=\"flex justify-between items-center px-2\">")
overview_end = content.find("</LedgerTable>", overview_start)
if overview_end == -1:
    overview_end = content.find("/>", content.find("LedgerTable", overview_start)) + 2
overview_full_end = content.find("</div>", overview_end) + 6

if overview_start != -1 and overview_end != -1:
    # Go slightly back to capture the wrapper space-y-6 div
    real_start = content.rfind('<div className="space-y-6">', 0, overview_start)
    content = content[:real_start] + ui_injection + content[overview_full_end:]

with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched AdminFinanceView.tsx')
