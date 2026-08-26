import sys

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The start is line 280 (index 279), the end is just before line 493 (index 492)
# But just to be robust, let's find the indices dynamically:

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "{activeTab === 'config' ? (" in line:
        start_idx = i
    if "{/* Payment History Modal */}" in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    new_jsx = """      {activeTab === 'config' ? (
        <FeeConfigurationTab activeYear={activeYear} />
      ) : activeTab === 'defaulters' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-rose-800">Defaulters & Aging</h3>
          </div>
          <DefaultersTable
            defaulters={defaulters}
            remindedIds={remindedIds}
            onCollect={handleOpenPayment}
            onRemind={handleMarkReminded}
            getAgingBucket={getAgingBucket}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold text-slate-800">Student Fee Ledgers</h3>
            <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setTimeFilter('month')}
                className={`px-4 py-2 text-sm font-bold transition-colors ${timeFilter === 'month' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                This Month
              </button>
              <div className="w-px bg-slate-200"></div>
              <button 
                onClick={() => setTimeFilter('year')}
                className={`px-4 py-2 text-sm font-bold transition-colors ${timeFilter === 'year' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Full Year
              </button>
            </div>
          </div>
          
          <LedgerTable
            ledgers={filteredLedgers}
            activeYear={activeYear}
            onViewHistory={handleViewHistory}
            onCollect={handleOpenPayment}
          />
        </div>
      )}
"""
    new_lines = lines[:start_idx] + [new_jsx] + lines[end_idx:]
    with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully replaced legacy UI with modular components!")
else:
    print(f"Failed to find indices. Start: {start_idx}, End: {end_idx}")
