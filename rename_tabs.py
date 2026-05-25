with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Rename nav tabs
replacements = [
    ('>Log POD</button>', '>POD Capturing</button>'),
    ('>Create Note</button>', '>Collection Note</button>'),
]

for old, new in replacements:
    assert content.count(old) == 1, f"FAIL: '{old}' not found"
    content = content.replace(old, new, 1)
    print(f"OK: '{old}' -> '{new}'")

# Also update the page heading inside the Log POD view
content = content.replace(
    "{editingPod ? 'Edit POD' : 'Log Received POD'}",
    "{editingPod ? 'Edit POD' : 'POD Capturing'}"
)
print("OK: Log POD heading updated")

# And the Create Note heading
content = content.replace(
    "<h2 style={S.heading}>Create Collection Note</h2>",
    "<h2 style={S.heading}>Collection Note</h2>"
)
print("OK: Create Note heading updated")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved.")
