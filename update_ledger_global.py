import sys

with open('src/pages/admin/finance/components/LedgerTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'globalOutstanding' not in content:
    content = content.replace('outstanding: number;', 'outstanding: number;\n  globalOutstanding: number;')
    content = content.replace('const isPaid = group.outstanding <= 0;', 'const isPaid = group.globalOutstanding <= 0;')
    
    with open('src/pages/admin/finance/components/LedgerTable.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated LedgerTable.tsx with globalOutstanding")
