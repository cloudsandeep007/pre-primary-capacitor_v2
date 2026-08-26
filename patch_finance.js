const fs = require('fs');

const path = 'src/pages/admin/AdminFinanceView.tsx';
let content = fs.readFileSync(path, 'utf8');

const imports = `import { LedgerTable } from './finance/components/LedgerTable';
import { DefaultersTable } from './finance/components/DefaultersTable';
import { HistoryModal } from './finance/components/HistoryModal';
import { ReversalDialog } from './finance/components/ReversalDialog';
import { RecordPaymentModal } from './finance/components/RecordPaymentModal';
`;

content = content.replace("import { FeeConfigurationTab } from './finance/FeeConfigurationTab';", imports + "import { FeeConfigurationTab } from './finance/FeeConfigurationTab';");

// 1. Defaulters Table
const defStartStr = '{defaulters.length === 0 ? (';
const defEndStr = '          )}'; // End of defaulters mapping block
const defStartIndex = content.indexOf(defStartStr);
// Find the closing )} for the defaulters block
const defEndIndex = content.indexOf(defEndStr, defStartIndex) + defEndStr.length;

const newDefaulters = `<DefaultersTable
            defaulters={defaulters}
            remindedIds={remindedIds}
            onCollect={handleOpenPayment}
            onRemind={handleMarkReminded}
            getAgingBucket={getAgingBucket}
          />`;

content = content.substring(0, defStartIndex) + newDefaulters + content.substring(defEndIndex);

// 2. Ledgers Table
const ledStartStr = '{ledgers.length === 0 ? (';
const ledEndStr = '          )}';
const ledStartIndex = content.indexOf(ledStartStr);
const ledEndIndex = content.indexOf(ledEndStr, ledStartIndex) + ledEndStr.length;

const newLedgers = `<LedgerTable
            ledgers={ledgers}
            activeYear={activeYear}
            onViewHistory={handleViewHistory}
            onCollect={handleOpenPayment}
          />`;

content = content.substring(0, ledStartIndex) + newLedgers + content.substring(ledEndIndex);

// 3. Modals
const modalStartStr = '{/* History Modal */}';
const historyStartStr = '{historyTarget && (';
const histStartIndex = content.indexOf(historyStartStr);

// The rest of the file from histStartIndex contains HistoryModal, ReversalDialog, and PaymentModal
const modNew = `
      <HistoryModal
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
`;

content = content.substring(0, histStartIndex) + modNew;

// Wait, the `{historyTarget && (` does not include the `{/* History Modal */}` comment, which is fine, we just replace from historyStartStr to EOF. But there might be closing tags for the main div.
// The `modNew` string perfectly closes the div and the function.

fs.writeFileSync(path, content, 'utf8');
console.log('Patched AdminFinanceView.tsx successfully.');
