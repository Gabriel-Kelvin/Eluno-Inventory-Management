import os
import re

directory = r"d:\VEXABOT\Cursor\Eluno\frontend\src"

files_to_update = []
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            files_to_update.append(os.path.join(root, file))

for filepath in files_to_update:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "http://localhost:8000" in content:
        content = re.sub(r'\"http://localhost:8000(/api/[^\"]*)\"', r'api("\1")', content)
        content = re.sub(r'\'http://localhost:8000(/api/[^\']*)\'', r"api('\1')", content)
        content = re.sub(r'`http://localhost:8000(/api/[^`]*)`', r'api(`\1`)', content)
        
        if "import { api }" not in content:
            # Insert after the last import, or at the top if no imports
            imports_end = 0
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    imports_end = i + 1
            
            lines.insert(imports_end, 'import { api } from "@/lib/api";')
            content = '\n'.join(lines)
            
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")
