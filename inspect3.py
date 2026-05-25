with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print the cert view block (line 570 onwards, about 100 lines)
print("=== CERT VIEW (lines 570-670) ===")
for i, l in enumerate(lines[569:669], start=570):
    print(f"{i}: {l}", end='')
