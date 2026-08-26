import sys
import re

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Compute global outstanding mapping
global_logic = """
  // Compute true global outstanding per student (ignoring time/category filters)
  const globalOutstandingMap = useMemo(() => {
    const map: Record<string, number> = {};
    ledgers.forEach(l => {
      if (l.status !== 'Waived' && l.status !== 'Cancelled') {
        const sid = l.student_id;
        const pending = (Number(l.total_due) || 0) - (Number(l.amount_paid) || 0);
        map[sid] = (map[sid] || 0) + pending;
      }
    });
    return map;
  }, [ledgers]);
"""

# Insert this before baseFilteredLedgers
base_start = content.find("  // 1. First apply time and category filters to raw ledgers")
if base_start != -1 and "const globalOutstandingMap" not in content:
    content = content[:base_start] + global_logic + "\n" + content[base_start:]

# 2. Add globalOutstanding to studentGroups
group_init = """groups[sid] = { 
          studentId: sid,
          studentName: l.student?.name || 'Unknown Student',
          className: l.student?.class_name || 'Unknown Class',
          ledgers: [], 
          totalDue: 0, 
          totalPaid: 0,
          outstanding: 0,
          globalOutstanding: globalOutstandingMap[sid] || 0
        };"""
content = re.sub(r'groups\[sid\] = \{\s*studentId: sid,\s*studentName: [^,]+,\s*className: [^,]+,\s*ledgers: \[\],\s*totalDue: 0,\s*totalPaid: 0,\s*outstanding: 0\s*\};', group_init, content)

# Also fix the dependency array for studentGroups to include globalOutstandingMap
dep_array = "}, [baseFilteredLedgers]);"
new_dep_array = "}, [baseFilteredLedgers, globalOutstandingMap]);"
content = content.replace(dep_array, new_dep_array)

# 3. Update statusFilter logic to use globalOutstanding
status_filter_logic_old = """      if (statusFilter === 'dues' && g.outstanding <= 0) return false;
      if (statusFilter === 'paid' && g.outstanding > 0) return false;"""
status_filter_logic_new = """      if (statusFilter === 'dues' && g.globalOutstanding <= 0) return false;
      if (statusFilter === 'paid' && g.globalOutstanding > 0) return false;"""
content = content.replace(status_filter_logic_old, status_filter_logic_new)


with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AdminFinanceView.tsx with globalOutstandingMap")
