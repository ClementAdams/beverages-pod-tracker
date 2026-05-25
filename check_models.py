with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("certSchema defined:", 'certSchema' in content)
print("DestructionCert model:", "mongoose.model('DestructionCert'" in content)

# Find the model registrations
idx = content.find("const Pod = mongoose.model")
print("\n--- Model registrations ---")
print(content[idx:idx+300])

# Find certSchema definition
idx2 = content.find('certSchema')
print("\n--- certSchema location ---")
print(content[idx2:idx2+400])
