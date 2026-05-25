with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Check for common JS syntax issues
print("duplicate finally count:", content.count('finally { setLoading(false); }'))
print("certCanvasRef defined:", 'certCanvasRef = useRef' in content)
print("nextNoteSeq declared:", 'const [nextNoteSeq' in content)
print("nextCertSeq declared:", 'const [nextCertSeq' in content)
print("certForm declared:", 'const [certForm' in content)
print("certs state declared:", 'const [certs, setCerts]' in content)

# Check for unclosed JSX - count braces in script section
script_start = content.find('<script type="text/babel">')
script_end = content.rfind('</script>')
script = content[script_start:script_end]
opens = script.count('{')
closes = script.count('}')
print(f"Open braces: {opens}, Close braces: {closes}, Diff: {opens - closes}")

# Check for duplicate state declarations
import re
states = re.findall(r'const \[(\w+),', script)
from collections import Counter
dupes = {k: v for k, v in Counter(states).items() if v > 1}
print("Duplicate states:", dupes)
