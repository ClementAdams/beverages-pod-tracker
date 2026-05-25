with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Remove duplicate finally block in submitPod
old = "    finally { setLoading(false); }\n    finally { setLoading(false); }"
new = "    finally { setLoading(false); }"
count = content.count(old)
print("duplicate finally found:", count)
if count == 1:
    content = content.replace(old, new, 1)
    print("OK - duplicate finally removed")
else:
    print("ERROR - pattern not found, checking manually...")
    idx = content.find('finally { setLoading(false); }')
    print(repr(content[idx-50:idx+200]))

# Fix 2: noteForm state - the farmEmail/myEmail weren't added in step 2 correctly
# Check current state
idx = content.find('useState({ driverName')
current = content[idx:idx+250]
print("current noteForm:", repr(current))

if "farmEmail" not in current:
    old2 = "useState({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: 'ch1wasteservice@gmail.com', periodStart: '', periodEnd: '', manifestNumber: '', manifestPhoto: null });\n  const manif"
    new2 = "useState({ driverName: '', vehicleInfo: '', farmDestination: '', accountantEmail: 'ch1wasteservice@gmail.com', farmEmail: '', myEmail: '', periodStart: '', periodEnd: '', manifestNumber: '', manifestPhoto: null });\n  const manif"
    if content.count(old2) == 1:
        content = content.replace(old2, new2, 1)
        print("OK - farmEmail/myEmail added to noteForm state")
    else:
        print("ERROR - noteForm pattern not found")
        print("count:", content.count("useState({ driverName"))
else:
    print("farmEmail already in noteForm state - OK")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved. Length:", len(content))
