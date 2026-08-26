import sys

with open('src/pages/admin/AdminFinanceView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Find the defaulters block
def_start = content.find("  // Defaulters: overdue ledgers")
def_end = content.find("}, [ledgers]);", def_start) + len("}, [ledgers]);")

if def_start != -1 and def_end != -1:
    defaulters_block = content[def_start:def_end]
    
    # Remove it from the current position
    content = content[:def_start] + content[def_end:]
    
    # 2. Find `if (loading) {`
    load_start = content.find("  if (loading) {")
    
    if load_start != -1:
        # Insert just before `if (loading) {`
        content = content[:load_start] + defaulters_block + "\n\n" + content[load_start:]
        
        with open('src/pages/admin/AdminFinanceView.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Moved defaulters useMemo successfully.")
    else:
        print("Could not find if (loading) block.")
else:
    print("Could not find defaulters block.")
