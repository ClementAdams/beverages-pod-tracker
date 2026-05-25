with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: add upload.none() to destruction-cert POST so FormData is parsed
old = "app.post('/api/destruction-cert', auth, async (req, res) => {"
new = "app.post('/api/destruction-cert', auth, upload.none(), async (req, res) => {"
assert content.count(old) == 1, "FAIL: route not found"
content = content.replace(old, new, 1)
print("OK: upload.none() added to destruction-cert POST")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js saved")
