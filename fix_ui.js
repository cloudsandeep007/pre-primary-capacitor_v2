const fs = require('fs');

const path = 'src/pages/admin/AdminFinanceView.tsx';
let content = fs.readFileSync(path, 'utf8');

// The active tabs switch happens here:
// {activeTab === 'overview' && ( ... )}
// Let's replace the ENTIRE {activeTab === 'overview' && ( ... )} block.

const extractBlock = (content, startTag) => {
    let startIndex = content.indexOf(startTag);
    if (startIndex === -1) return null;
    
    let braceCount = 0;
    let inBlock = false;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
    }
    return { start: startIndex, end: endIndex };
}

const overviewBlock = extractBlock(content, "{activeTab === 'overview' && (");
if (overviewBlock) {
    const newOverview = `{activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Fee Ledgers</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTimeFilter('month')}
                  className={\`px-4 py-2 rounded-xl text-sm font-bold transition-colors \${timeFilter === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => setTimeFilter('year')}
                  className={\`px-4 py-2 rounded-xl text-sm font-bold transition-colors \${timeFilter === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
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
        )}`;
    content = content.substring(0, overviewBlock.start) + newOverview + content.substring(overviewBlock.end);
}

const defaultersBlock = extractBlock(content, "{activeTab === 'defaulters' && (");
if (defaultersBlock) {
    const newDefaulters = `{activeTab === 'defaulters' && (
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
        )}`;
    content = content.substring(0, defaultersBlock.start) + newDefaulters + content.substring(defaultersBlock.end);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed AdminFinanceView UI');
