const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://chwasteservices:En8skWMgnhxibpt@cluster0.ip2dkof.mongodb.net/pod-tracker?retryWrites=true&w=majority&appName=Cluster0';

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'crew', 'farm'], default: 'crew' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const users = [
  { username: 'admin',  password: 'admin123',   role: 'admin' },
  { username: 'lucia',  password: 'Lucia@2026',  role: 'admin' },
  { username: 'clem',   password: 'Clem@2026',   role: 'admin' },
  { username: 'osdam',  password: 'Osdam@2026',  role: 'farm'  },
  { username: 'Chill',  password: 'password123', role: 'crew'  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const u of users) {
    const existing = await User.findOne({ username: u.username });
    if (existing) {
      // Update password and role in case they changed
      existing.password = await bcrypt.hash(u.password, 10);
      existing.role = u.role;
      await existing.save();
      console.log('Updated:', u.username, '| role:', u.role);
    } else {
      const hash = await bcrypt.hash(u.password, 10);
      await User.create({ username: u.username, password: hash, role: u.role });
      console.log('Created:', u.username, '| role:', u.role);
    }
  }

  console.log('\nAll users set up successfully!');
  console.log('-----------------------------------');
  users.forEach(u => console.log(`  ${u.username.padEnd(10)} | ${u.role.padEnd(6)} | ${u.password}`));
  console.log('-----------------------------------');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
