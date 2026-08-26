import sys

with open('src/pages/admin/finance/components/RecordPaymentModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add props
props = """  payRemarks: string;
  setPayRemarks: (val: string) => void;
  payPeriodType: string;
  setPayPeriodType: (val: string) => void;
  payPeriodValue: string;
  setPayPeriodValue: (val: string) => void;
  isPaying: boolean;"""
content = content.replace("  payRemarks: string;\n  setPayRemarks: (val: string) => void;\n  isPaying: boolean;", props)

# Add destructuring
destruct = """  payRemarks,
  setPayRemarks,
  payPeriodType,
  setPayPeriodType,
  payPeriodValue,
  setPayPeriodValue,
  isPaying,"""
content = content.replace("  payRemarks,\n  setPayRemarks,\n  isPaying,", destruct)

# Add UI fields before Remarks
ui_fields = """          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Payment Period</label>
              <select
                value={payPeriodType}
                onChange={e => { setPayPeriodType(e.target.value); setPayPeriodValue(''); }}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Unspecified">Unspecified</option>
                <option value="Monthly">Monthly</option>
                <option value="Term">Termly</option>
                <option value="Yearly">Yearly</option>
                <option value="One-time">One-time</option>
              </select>
            </div>
            
            {payPeriodType !== 'Unspecified' && payPeriodType !== 'One-time' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  {payPeriodType === 'Monthly' ? 'Month' : payPeriodType === 'Term' ? 'Term Name' : 'Year'} *
                </label>
                <input
                  type={payPeriodType === 'Monthly' ? 'month' : 'text'}
                  value={payPeriodValue}
                  onChange={e => setPayPeriodValue(e.target.value)}
                  placeholder={payPeriodType === 'Term' ? 'e.g. Term 1' : payPeriodType === 'Yearly' ? 'e.g. 2026-27' : ''}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Remarks (Optional)</label>"""

content = content.replace("          <div>\n            <label className=\"block text-xs font-bold text-slate-700 mb-1.5 uppercase\">Remarks (Optional)</label>", ui_fields)

with open('src/pages/admin/finance/components/RecordPaymentModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated RecordPaymentModal.tsx")
