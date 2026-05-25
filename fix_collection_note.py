with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Change COL064 to COL065 ────────────────────────────────────────────
old1 = 'COL064'
new1 = 'COL065'
count1 = content.count(old1)
print(f"COL064 occurrences: {count1}")
content = content.replace(old1, new1)
print("OK 1: COL064 → COL065")

# ── 2. Fix Farm Destination to Osdam Farm ────────────────────────────────
# Fix default farmDestination value in the PDF generator
old2 = "note.farmDestination || 'Farm'"
new2 = "note.farmDestination || 'Osdam Farm'"
if content.count(old2) == 1:
    content = content.replace(old2, new2, 1)
    print("OK 2a: farmDestination default → Osdam Farm")
else:
    print(f"NOTE 2a: '{old2}' found {content.count(old2)} times — skipping")

# Also fix any hardcoded farm destination label in PDF
old2b = "'Farm Destination'"
new2b = "'Farm Destination: Osdam Farm'"
if content.count(old2b) >= 1:
    content = content.replace(old2b, new2b, 1)
    print("OK 2b: Farm Destination label updated")

# ── 3. Fix PDF table column alignment ────────────────────────────────────
# Find the items table section and replace with properly aligned columns
old3 = """    // Items table
    const tableTop = doc.y + 10;
    const col = { item: 50, desc: 110, vol: 260, qty: 320, pallets: 375, litres: 430 };"""
new3 = """    // Items table
    const tableTop = doc.y + 10;
    const col = { item: 50, desc: 120, vol: 240, qty: 295, pallets: 345, litres: 400, recv: 455 };"""

if content.count(old3) == 1:
    content = content.replace(old3, new3, 1)
    print("OK 3: table column positions fixed")
else:
    print(f"NOTE 3: col definition not found with that exact text ({content.count(old3)})")
    # Try to find what's there
    idx = content.find('const col = {')
    if idx > 0:
        print("Found col definition at:", content[idx:idx+200])

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("\nserver.js saved.")
