import re
import io

def fix_file():
    filepath = 'src/pages/admin/AdminFinanceView.tsx'
    with io.open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import useMemo
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';")
    
    # Type filteredLedgers
    content = content.replace("const filteredLedgers = useMemo(() => {", "const filteredLedgers = useMemo((): StudentFee[] => {")

    with io.open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file()
print("Fixed TS")
