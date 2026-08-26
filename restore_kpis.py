import sys

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

kpi_block = """
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1.5">
                <FileText size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Total Expected</h3>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">₹{totalExpected.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
                <CheckCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Collected</h3>
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">₹{totalCollected.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 mb-1.5">
                <AlertCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Pending Dues</h3>
              </div>
              <p className="text-2xl font-extrabold text-rose-700">₹{totalPending.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-1.5">
                <Percent size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Discounts</h3>
              </div>
              <p className="text-2xl font-extrabold text-amber-700">₹{totalDiscounts.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600 mb-1.5">
                <XCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Waived Fees</h3>
              </div>
              <p className="text-2xl font-extrabold text-slate-700">{totalWaivedCount} <span className="text-sm font-normal text-slate-500">students</span></p>
            </div>
          </div>
"""

# We want to insert this right after `        <div className="space-y-6">` that wraps the overview tab.
# Wait, let's find `{/* TOP CONTROLS */}`
target_idx = content.find("{/* TOP CONTROLS */}")

if target_idx != -1:
    content = content[:target_idx] + kpi_block + "\n          " + content[target_idx:]
    with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully restored KPI Cards.")
else:
    print("Could not find Top Controls.")
