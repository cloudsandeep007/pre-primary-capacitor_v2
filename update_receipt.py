import sys

with open('src/lib/receiptUtils.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to generateFeeReceiptHtml
period_html = """            <tr>
                <td style="color: #64748b; padding: 4px 0;">Fee Type:</td>
                <td style="font-weight: 600; text-align: right;">${ledger.structure?.category?.name || ledger.structure?.fee_category || 'General Fee'}</td>
            </tr>
            ${payment.period_type && payment.period_type !== 'Unspecified' ? `
            <tr>
                <td style="color: #64748b; padding: 4px 0;">Payment Period:</td>
                <td style="font-weight: 600; text-align: right;">${payment.period_value || ''} (${payment.period_type})</td>
            </tr>
            ` : ''}"""

content = content.replace("""            <tr>
                <td style="color: #64748b; padding: 4px 0;">Fee Type:</td>
                <td style="font-weight: 600; text-align: right;">${ledger.structure?.category?.name || ledger.structure?.fee_category || 'General Fee'}</td>
            </tr>""", period_html)

with open('src/lib/receiptUtils.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated receiptUtils.ts")
