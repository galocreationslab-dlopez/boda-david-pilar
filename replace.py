import re
import os

files = ['public/images/alhambra_bn.svg', 'public/images/catedral_bn.svg']
pattern = re.compile(r'data-region="(\d+)"fill=')

for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        matches = len(pattern.findall(content))
        print(f"{fpath}: found {matches} matches before replacement")
        
        new_content = pattern.sub(r'data-region="\1" fill=', content)
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"{fpath}: replaced successfully")
    else:
        print(f"{fpath}: not found")
