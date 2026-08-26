import sys

def extract_block(content, start_tag):
    start_index = content.find(start_tag)
    if start_index == -1:
        return None
    
    brace_count = 0
    end_index = start_index
    for i in range(start_index, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_index = i + 1
                break
    return (start_index, end_index)

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

overview_block = extract_block(content, "{activeTab === 'overview' && (")
if overview_block:
    new_overview = """{activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Fee Ledgers</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTimeFilter('month')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${timeFilter === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => setTimeFilter('year')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${timeFilter === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
        )}"""
    content = content[:overview_block[0]] + new_overview + content[overview_block[1]:]

defaulters_block = extract_block(content, "{activeTab === 'defaulters' && (")
if defaulters_block:
    new_defaulters = """{activeTab === 'defaulters' && (
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
        )}"""
    content = content[:defaulters_block[0]] + new_defaulters + content[defaulters_block[1]:]

with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed AdminFinanceView UI via Python')
