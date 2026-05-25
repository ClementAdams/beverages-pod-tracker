with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Check destruction cert route exists
print("POST /api/destruction-cert exists:", "app.post('/api/destruction-cert'" in content)
print("GET /api/destruction-certs exists:", "app.get('/api/destruction-certs'" in content)
print("DestructionCert model exists:", 'DestructionCert' in content)

# Find and print the POST route
idx = content.find("app.post('/api/destruction-cert'")
if idx >= 0:
    print("\n--- POST route ---")
    print(content[idx:idx+600])
else:
    print("POST route NOT FOUND")
