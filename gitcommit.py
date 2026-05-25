import subprocess
result = subprocess.run(
    ['git', 'commit', '-m', 'Add auto-incrementing note numbers, farmEmail and myEmail fields'],
    cwd=r'C:\Users\Clem8\Documents\beverage-pod-tracker',
    capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
