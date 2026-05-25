with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = ">Destroy Cert</button>"
new = ">Destruction Certificate</button>"
assert content.count(old) == 1, "FAIL: tab label not found"
content = content.replace(old, new, 1)
print("OK: tab label updated")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("index.html saved")
