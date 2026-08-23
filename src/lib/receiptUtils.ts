import { StudentFee, FeePayment } from '@/services/feeService';

export function generateFeeReceiptHtml(
  studentName: string,
  className: string,
  pay: FeePayment,
  ledger: StudentFee
): string {
  const pendingBalance = ledger.total_due - ledger.amount_paid;
  const originalFee = ledger.structure?.amount || (ledger.total_due + (ledger.discount_amount || 0));
  
  return `
    <html>
    <head>
      <title>Receipt - ${pay.receipt_number}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .school-name { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
        .receipt-title { font-size: 18px; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .value { font-size: 16px; font-weight: 500; color: #0f172a; }
        .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
        .amount-val { font-size: 32px; font-weight: bold; color: #10b981; }
        .summary-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 30px; background: #fff; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0; }
        .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 16px; padding-top: 12px; color: #0f172a; }
        .text-rose { color: #ef4444; }
        .text-amber { color: #d97706; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="school-name">Pre-Primary School</h1>
        <div class="receipt-title">FEE RECEIPT</div>
      </div>
      
      <div class="meta">
        <div><b>Receipt No:</b> ${pay.receipt_number}</div>
        <div><b>Date:</b> ${new Date(pay.payment_date || '').toLocaleDateString('en-IN')}</div>
      </div>

      <div class="grid">
        <div>
          <div class="label">Student Name</div>
          <div class="value">${studentName}</div>
        </div>
        <div>
          <div class="label">Class</div>
          <div class="value">${className}</div>
        </div>
        <div>
          <div class="label">Fee Category</div>
          <div class="value">${ledger.structure?.category?.name || ledger.structure?.fee_category}</div>
        </div>
        <div>
          <div class="label">Payment Mode</div>
          <div class="value">${pay.payment_mode} ${pay.reference_number ? '(' + pay.reference_number + ')' : ''}</div>
        </div>
      </div>

      <div class="amount-box">
        <div class="label">Amount Received</div>
        <div class="amount-val">₹${pay.amount.toLocaleString()}</div>
        <div style="font-size: 14px; color: #64748b; margin-top: 8px;">
          ${pay.remarks ? 'Remarks: ' + pay.remarks : 'Thank you for your payment.'}
        </div>
      </div>

      <div class="summary-box">
        <div class="summary-row">
          <span>Original Academic Fee</span>
          <span>₹${originalFee.toLocaleString()}</span>
        </div>
        ${ledger.discount_amount > 0 ? `
        <div class="summary-row text-amber">
          <span>Discount Applied</span>
          <span>-₹${ledger.discount_amount.toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="summary-row">
          <span>Total Adjusted Due</span>
          <span>₹${ledger.total_due.toLocaleString()}</span>
        </div>
        <div class="summary-row">
          <span>Total Paid to Date</span>
          <span>₹${ledger.amount_paid.toLocaleString()}</span>
        </div>
        <div class="summary-row ${pendingBalance > 0 ? 'text-rose' : ''}">
          <span>Current Outstanding Balance</span>
          <span>${ledger.status === 'Waived' ? 'WAIVED' : '₹' + pendingBalance.toLocaleString()}</span>
        </div>
      </div>

      <div class="footer">
        This is a system generated receipt and does not require a physical signature.
      </div>
    </body>
    </html>
  `;
}

export function printReceipt(html: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 250);
  }
}
