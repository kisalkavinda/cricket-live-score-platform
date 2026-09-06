import re

for path in ['apps/web/.env.local']:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(r'pool_timeout=\d+', 'pool_timeout=60', content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {path}")
    else:
        print(f"No changes in {path}")
