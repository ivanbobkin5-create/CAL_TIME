import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    updated = content.replace('Мебельный калькулятор & ERP Мебельное производство', 'Мебельный калькулятор')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(updated)
    print(f'Updated {filepath}')

fix_file('src/components/Legal/LegalDocumentsView.tsx')
fix_file('server.ts')
