import sys
import re

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add state
new_state = """  const [payRemarks, setPayRemarks] = useState('');
  const [payPeriodType, setPayPeriodType] = useState('Unspecified');
  const [payPeriodValue, setPayPeriodValue] = useState('');"""
content = content.replace("  const [payRemarks, setPayRemarks] = useState('');", new_state)

# Add to RecordPaymentModal JSX
modal_str = """      <RecordPaymentModal
        paymentTarget={paymentTarget}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payMode={payMode}
        setPayMode={setPayMode}
        payRef={payRef}
        setPayRef={setPayRef}
        payRemarks={payRemarks}
        setPayRemarks={setPayRemarks}
        payPeriodType={payPeriodType}
        setPayPeriodType={setPayPeriodType}
        payPeriodValue={payPeriodValue}
        setPayPeriodValue={setPayPeriodValue}"""
content = content.replace("""      <RecordPaymentModal
        paymentTarget={paymentTarget}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payMode={payMode}
        setPayMode={setPayMode}
        payRef={payRef}
        setPayRef={setPayRef}
        payRemarks={payRemarks}
        setPayRemarks={setPayRemarks}""", modal_str)

# Reset state in handleOpenPayment
open_payment = """  const handleOpenPayment = (target: StudentFee) => {
    setPaymentTarget(target);
    setPayAmount((target.total_due - (target.amount_paid || 0)).toString());
    setPayMode('Cash');
    setPayRef('');
    setPayRemarks('');
    setPayPeriodType('Unspecified');
    setPayPeriodValue('');
  };"""
content = re.sub(r'const handleOpenPayment = \(target: StudentFee\) => \{[\s\S]*?\};', open_payment, content)

# In handleRecordPayment, add to payload
payload = """      const payload: FeePayment = {
        student_fee_id: paymentTarget.id!,
        amount: parseFloat(payAmount),
        payment_mode: payMode,
        reference_number: payRef,
        remarks: payRemarks,
        receipt_number: `RCPT-${Date.now().toString().slice(-6)}`,
        period_type: payPeriodType,
        period_value: payPeriodType === 'Unspecified' ? undefined : payPeriodValue,
      };"""
content = re.sub(r'const payload: FeePayment = \{[\s\S]*?receipt_number:.*?,?\n\s*\};', payload, content)

with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AdminFinanceView.tsx")
