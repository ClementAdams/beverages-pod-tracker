with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print lines 95-115 (state declarations area)
print("=== STATE DECLARATIONS (lines 95-120) ===")
for i, l in enumerate(lines[94:120], start=95):
    print(f"{i}: {l}", end='')

print("\n=== submitCert function ===")
for i, l in enumerate(lines, start=1):
    if 'submitCert' in l or 'initCertCanvas' in l:
        print(f"{i}: {l}", end='')

print("\n=== Lines around certCanvasRef useRef ===")
for i, l in enumerate(lines, start=1):
    if 'certCanvasRef' in l and 'useRef' in l:
        # print surrounding context
        for j in range(max(0,i-3), min(len(lines), i+3)):
            print(f"{j+1}: {lines[j]}", end='')
        print("---")
