with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Verify what cert-related things exist
print("certSchema:", 'certSchema' in content)
print("DestructionCert model:", 'DestructionCert' in content)
print("generateDestructionCertPDF:", 'generateDestructionCertPDF' in content)
print("POST /api/destruction-cert:", "app.post('/api/destruction-cert'" in content)
print("GET /api/destruction-certs:", "app.get('/api/destruction-certs'" in content)
print("GET cert pdf route:", "destruction-cert/:certId/pdf" in content)

# Show all destruction-cert related lines
import re
for i, line in enumerate(content.split('\n'), 1):
    if 'destruction' in line.lower() or 'DestructionCert' in line or 'certSchema' in line or 'generateDest' in line:
        print(f"Line {i}: {line.strip()}")
