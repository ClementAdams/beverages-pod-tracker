import subprocess
result = subprocess.run(
    ['git', 'add', 'server.js'],
    cwd=r'C:\Users\Clem8\Documents\beverage-pod-tracker',
    capture_output=True, text=True
)
print("add:", result.stdout, result.stderr)

result = subprocess.run(
    ['git', 'commit', '-m', 'Fix collection note COL065 column alignment and Osdam Farm'],
    cwd=r'C:\Users\Clem8\Documents\beverage-pod-tracker',
    capture_output=True, text=True
)
print("commit:", result.stdout, result.stderr)

result = subprocess.run(
    ['git', 'push'],
    cwd=r'C:\Users\Clem8\Documents\beverage-pod-tracker',
    capture_output=True, text=True
)
print("push:", result.stdout, result.stderr)
