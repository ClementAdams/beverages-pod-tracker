with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the cert view block
start = None
for i, l in enumerate(lines, start=1):
    if "DESTRUCTION CERTIFICATE" in l and "view ===" in l:
        start = i
        break

if start:
    print(f"Cert view starts at line {start}")
    for i, l in enumerate(lines[start-1:start+120], start=start):
        print(f"{i}: {l}", end='')
else:
    print("Cert view not found - searching...")
    for i, l in enumerate(lines, start=1):
        if 'cert' in l.lower() and 'view' in l.lower():
            print(f"{i}: {l}", end='')
