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
          <div class="value">${ledger.category?.name || ledger.structure?.category?.name || ledger.structure?.fee_category || 'Ad-Hoc Fee'}</div>
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

/**
 * Generate a combined annual fee invoice for a student across all their fee ledgers.
 * This is distinct from generateFeeReceiptHtml which is per-payment.
 */
export function generateFeeInvoiceHtml(
  studentName: string,
  className: string,
  ledgers: StudentFee[],
  payments: FeePayment[]
): string {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const grandTotalDue = ledgers.reduce((sum, l) => sum + (l.total_due || 0), 0);
  const grandTotalPaid = ledgers.reduce((sum, l) => sum + (l.amount_paid || 0), 0);
  const grandDiscount = ledgers.reduce((sum, l) => sum + (l.discount_amount || 0), 0);
  const grandPending = grandTotalDue - grandTotalPaid;

  const ledgerRows = ledgers.map(l => {
    const categoryName = l.category?.name || l.structure?.category?.name || l.structure?.fee_category || 'Ad-Hoc Fee';
    const pending = (l.total_due || 0) - (l.amount_paid || 0);
    const statusColor = l.status === 'Paid' ? '#10b981' : l.status === 'Waived' ? '#94a3b8' : '#f43f5e';
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${categoryName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">&#8377;${(l.total_due + (l.discount_amount || 0)).toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#d97706;">${l.discount_amount > 0 ? '-&#8377;' + l.discount_amount.toLocaleString() : '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">&#8377;${(l.total_due || 0).toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#10b981;">&#8377;${(l.amount_paid || 0).toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:${statusColor};font-weight:600;">${l.status === 'Waived' ? 'WAIVED' : '&#8377;' + pending.toLocaleString()}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;"><span style="background:${l.status === 'Paid' ? '#d1fae5' : l.status === 'Waived' ? '#f1f5f9' : '#fee2e2'};color:${statusColor};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${l.status.toUpperCase()}</span></td>
      </tr>`;
  }).join('');

  const paymentRows = payments.length > 0
    ? payments.map(p => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;">${new Date(p.payment_date || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;font-family:monospace;">${p.receipt_number}</td>
        <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;">${p.payment_mode}</td>
        <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;">${p.reference_number || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px dashed #e2e8f0;font-size:13px;text-align:right;color:#10b981;font-weight:600;">&#8377;${p.amount.toLocaleString()}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No payments recorded yet.</td></tr>`;

  return `
    <html>
    <head>
      <title>Invoice - ${studentName}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
        th:not(:first-child) { text-align: right; }
        th:last-child { text-align: center; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }
        .school-name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .invoice-label { font-size: 28px; font-weight: 800; color: #4f46e5; margin: 0; }
        .invoice-meta { font-size: 13px; color: #64748b; text-align: right; }
        .student-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; display: flex; gap: 40px; }
        .sl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; }
        .sv { font-size: 16px; font-weight: 700; color: #0f172a; }
        .section-title { font-size: 14px; font-weight: 700; color: #334155; margin: 28px 0 10px; border-left: 3px solid #4f46e5; padding-left: 10px; }
        .totals-row td { padding: 12px; font-weight: 700; background: #f8fafc; font-size: 15px; }
        .grand-balance { font-size: 20px; font-weight: 800; color: ${grandPending > 0 ? '#f43f5e' : '#10b981'}; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <p class="school-name">Pre-Primary School</p>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">Fee Invoice — Academic Year</div>
        </div>
        <div>
          <p class="invoice-label">INVOICE</p>
          <div class="invoice-meta">
            <div><b>Invoice No:</b> ${invoiceNo}</div>
            <div><b>Date:</b> ${today}</div>
          </div>
        </div>
      </div>

      <div class="student-box">
        <div><div class="sl">Student Name</div><div class="sv">${studentName}</div></div>
        <div><div class="sl">Class</div><div class="sv">${className}</div></div>
        <div><div class="sl">Total Outstanding</div><div class="sv" style="color:${grandPending > 0 ? '#f43f5e' : '#10b981'};">&#8377;${grandPending.toLocaleString()}</div></div>
      </div>

      <div class="section-title">Fee Summary</div>
      <table>
        <thead>
          <tr>
            <th>Fee Category</th>
            <th style="text-align:right;">Original</th>
            <th style="text-align:right;">Discount</th>
            <th style="text-align:right;">Total Due</th>
            <th style="text-align:right;">Paid</th>
            <th style="text-align:right;">Outstanding</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${ledgerRows}
          <tr class="totals-row">
            <td>TOTAL</td>
            <td style="text-align:right;">&#8377;${(grandTotalDue + grandDiscount).toLocaleString()}</td>
            <td style="text-align:right;color:#d97706;">${grandDiscount > 0 ? '-&#8377;' + grandDiscount.toLocaleString() : '-'}</td>
            <td style="text-align:right;">&#8377;${grandTotalDue.toLocaleString()}</td>
            <td style="text-align:right;color:#10b981;">&#8377;${grandTotalPaid.toLocaleString()}</td>
            <td style="text-align:right;" class="grand-balance">&#8377;${grandPending.toLocaleString()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Payment History</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Receipt No</th>
            <th>Mode</th>
            <th>Reference</th>
            <th style="text-align:right;">Amount (&#8377;)</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRows}
        </tbody>
      </table>

      <div class="footer">
        This is a computer-generated invoice and does not require a physical signature. &nbsp;|&nbsp; Generated on ${today}
      </div>
    </body>
    </html>
  `;
}
