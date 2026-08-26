import sys

with open('src/pages/admin/finance/components/HistoryModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

history_html = """                    <td className="p-4">
                      <p className="text-sm text-slate-700">{pay.payment_mode}</p>
                      {pay.reference_number && <p className="text-xs text-slate-400">{pay.reference_number}</p>}
                      {pay.period_type && pay.period_type !== 'Unspecified' && (
                        <p className="text-[10px] font-bold text-indigo-500 mt-0.5 uppercase tracking-wider">{pay.period_value} ({pay.period_type})</p>
                      )}
                    </td>"""

content = content.replace("""                    <td className="p-4">
                      <p className="text-sm text-slate-700">{pay.payment_mode}</p>
                      {pay.reference_number && <p className="text-xs text-slate-400">{pay.reference_number}</p>}
                    </td>""", history_html)

with open('src/pages/admin/finance/components/HistoryModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated HistoryModal.tsx")
