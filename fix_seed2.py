with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = "mongoose.connection.once('open', async () => {\n  const count = await User.countDocuments();\n  if (count === 0) {\n    const hash = await bcrypt.hash('admin123', 10);\n    await User.create({ username: 'admin', password: hash, role: 'admin' });\n    console.log('Default admin created: admin / admin123')"
new = """mongoose.connection.once('open', async () => {
  const defaultUsers = [
    { username: 'admin', password: 'admin123',   role: 'admin' },
    { username: 'lucia', password: 'Lucia@2026',  role: 'admin' },
    { username: 'clem',  password: 'Clem@2026',   role: 'admin' },
    { username: 'osdam', password: 'Osdam@2026',  role: 'farm'  },
    { username: 'Chill', password: 'password123', role: 'crew'  },
  ];
  for (const u of defaultUsers) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      const hash = await bcrypt.hash(u.password, 10);
      await User.create({ username: u.username, password: hash, role: u.role });
      console.log('Created user:', u.username);
    }
  }
  console.log('User setup complete');
  if (false"""

assert content.count(old) == 1, "FAIL"
content = content.replace(old, new, 1)
print("OK: seed block replaced")

with open(r'C:\Users\Clem8\Documents\beverage-pod-tracker\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
