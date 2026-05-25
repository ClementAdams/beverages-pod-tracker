with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Check the PDF route
idx = content.find("app.get('/api/destruction-cert/:certId/pdf'")
print("PDF route found:", idx >= 0)
if idx >= 0:
    print(content[idx:idx+300])

# Check generateDestructionCertPDF exists
print("\ngenerateDestructionCertPDF exists:", 'generateDestructionCertPDF' in content)

# Check for any issues in the function - find the regex line
idx2 = content.find('certSignature.replace')
if idx2 >= 0:
    print("\ncertSignature.replace line:")
    print(repr(content[idx2-10:idx2+80]))
