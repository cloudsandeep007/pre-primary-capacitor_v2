import sys

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import { LedgerTable } from './finance/components/LedgerTable';
import { DefaultersTable } from './finance/components/DefaultersTable';
import { HistoryModal } from './finance/components/HistoryModal';
import { ReversalDialog } from './finance/components/ReversalDialog';
import { RecordPaymentModal } from './finance/components/RecordPaymentModal';
"""
content = content.replace("import { FeeConfigurationTab } from './finance/FeeConfigurationTab';", imports + "import { FeeConfigurationTab } from './finance/FeeConfigurationTab';")

# 1. Defaulters Table
defStartStr = '{defaulters.length === 0 ? ('
defEndStr = '          )}'
defStartIndex = content.find(defStartStr)
# Find the second instance of defEndStr after defStartIndex
defEndIndex1 = content.find(defEndStr, defStartIndex)
defEndIndex2 = content.find(defEndStr, defEndIndex1 + len(defEndStr))

# Wait, the end of the mapping for defaulters might be just before the closing </div> of the tab.
# Let's find exact boundary.
import re
# Regex to match the entire {defaulters.length === 0 ? ( ... )} block
def_block = re.search(r'\{defaulters\.length === 0 \? \([\s\S]*?\}\n\s*\)', content)
if def_block:
    newDefaulters = """<DefaultersTable
            defaulters={defaulters}
            remindedIds={remindedIds}
            onCollect={handleOpenPayment}
            onRemind={handleMarkReminded}
            getAgingBucket={getAgingBucket}
          />"""
    content = content[:def_block.start()] + newDefaulters + content[def_block.end():]

# 2. Ledgers Table
led_block = re.search(r'\{ledgers\.length === 0 \? \([\s\S]*?\}\n\s*\)', content)
if led_block:
    newLedgers = """<LedgerTable
            ledgers={ledgers}
            activeYear={activeYear}
            onViewHistory={handleViewHistory}
            onCollect={handleOpenPayment}
          />"""
    content = content[:led_block.start()] + newLedgers + content[led_block.end():]

# 3. Modals
histStartIndex = content.find('{historyTarget && (')
if histStartIndex != -1:
    modNew = """<HistoryModal
        historyTarget={historyTarget}
        paymentHistory={paymentHistory}
        onClose={() => setHistoryTarget(null)}
        onPrintInvoice={() => handlePrintInvoice(historyTarget)}
        onPrintReceipt={(html) => printReceipt(html)}
        onReversePayment={(pay) => { setReversalTarget(pay); setReversalNote(''); }}
        canDelete={can('fees.delete')}
      />

      <ReversalDialog
        reversalTarget={reversalTarget}
        reversalNote={reversalNote}
        setReversalNote={setReversalNote}
        isReversing={isReversing}
        onClose={() => { setReversalTarget(null); setReversalNote(''); }}
        onConfirm={handleReversePayment}
      />

      <RecordPaymentModal
        paymentTarget={paymentTarget}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payMode={payMode}
        setPayMode={setPayMode}
        payRef={payRef}
        setPayRef={setPayRef}
        payRemarks={payRemarks}
        setPayRemarks={setPayRemarks}
        isPaying={isPaying}
        onClose={() => setPaymentTarget(null)}
        onConfirm={handleRecordPayment}
      />
    </div>
  );
}
"""
    content = content[:histStartIndex] + modNew

with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched successfully')
