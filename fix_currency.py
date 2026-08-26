import re
import io

def fix_file(filepath):
    with io.open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix in JSX tags
    content = re.sub(r'>[^\w\s<>]+\{', r'>₹{', content)
    
    # 2. Fix in Tooltips
    content = re.sub(r'formatter=\{\(value: any\) => `[^$]*\$\{', r'formatter={(value: any) => `₹${', content)

    # 3. Fix legends
    content = re.sub(r'name="Collected \([^)]+\)"', 'name="Collected (₹)"', content)
    content = re.sub(r'name="Pending \([^)]+\)"', 'name="Pending (₹)"', content)
    
    # 4. View Heatmap arrow
    content = re.sub(r'View Heatmap [^\<]+<', 'View Heatmap →<', content)

    with io.open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('src/pages/admin/AdminDashboardOverview.tsx')
fix_file('src/pages/admin/AdminFinanceView.tsx')
print("Fixed")
