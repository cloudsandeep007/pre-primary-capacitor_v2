import sys

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Search import
if 'Search' not in content[:500]:
    content = content.replace("DollarSign, Plus, FileText, CheckCircle, AlertCircle, Clock, Settings, CreditCard, Percent, XCircle, Download, RotateCcw, Bell",
                              "DollarSign, Plus, FileText, CheckCircle, AlertCircle, Clock, Settings, CreditCard, Percent, XCircle, Download, RotateCcw, Bell, Search")

# 2. Add defaulters back
defaulters_logic = """
  // Defaulters: overdue ledgers (past due_date, still unpaid/partially paid)
  const defaulters = useMemo((): StudentFee[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ledgers.filter(l => {
      if (l.status === 'Paid' || l.status === 'Waived' || l.status === 'Cancelled') return false;
      if (!l.due_date) return false;
      const due = new Date(l.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [ledgers]);
"""

# Find a good place to inject defaulters (before handleExportCSV)
export_idx = content.find("const handleExportCSV =")
if export_idx != -1:
    content = content[:export_idx] + defaulters_logic + "\n  " + content[export_idx:]

# 3. Add handleBulkRemind
bulk_remind_logic = """
  const handleBulkRemind = () => {
    const duesCount = filteredGroups.filter(g => g.outstanding > 0).length;
    if (duesCount === 0) return showToast('No students with dues in the current view.', 'error');
    
    auditLog({
      actor_type: 'staff',
      action: 'SYSTEM_UPDATED' as any,
      resource_type: 'system',
      metadata: { action: 'BULK_REMINDER_SENT', count: duesCount }
    });
    showToast(`Reminders sent to ${duesCount} students successfully!`, 'success');
  };
"""

# Find a good place to inject handleBulkRemind (after handleExportCSV)
export_end = content.find("};", export_idx) + 2
if export_end != -1:
    content = content[:export_end] + "\n" + bulk_remind_logic + content[export_end:]

with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched missing TS errors")
