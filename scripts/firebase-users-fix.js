const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { collection, doc, getDocs, getFirestore, serverTimestamp, updateDoc } = require('firebase/firestore');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
    result[key] = value;
  }

  return result;
}

function parseRuntimeEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/window\.__env\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) {
    return {};
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function parseFirebaseConfigFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const blockMatch = content.match(/firebaseConfig\s*:\s*\{([\s\S]*?)\}\s*,?/);
  if (!blockMatch) {
    return null;
  }

  const block = blockMatch[1];
  const cfg = {};
  const pairRegex = /(\w+)\s*:\s*'([^']*)'/g;
  let match;
  while ((match = pairRegex.exec(block)) !== null) {
    cfg[match[1]] = match[2];
  }

  if (!cfg.projectId || !cfg.apiKey || !cfg.appId) {
    return null;
  }

  return cfg;
}

function loadFirebaseConfig() {
  const root = process.cwd();
  const envFromDotEnv = parseEnvFile(path.join(root, '.env'));
  const envFromRuntimeFile = parseRuntimeEnvFile(path.join(root, 'src', 'assets', 'env.js'));

  const fromEnv = {
    apiKey: process.env.FIREBASE_API_KEY || envFromDotEnv.FIREBASE_API_KEY || envFromRuntimeFile.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || envFromDotEnv.FIREBASE_AUTH_DOMAIN || envFromRuntimeFile.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || envFromDotEnv.FIREBASE_PROJECT_ID || envFromRuntimeFile.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || envFromDotEnv.FIREBASE_STORAGE_BUCKET || envFromRuntimeFile.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || envFromDotEnv.FIREBASE_MESSAGING_SENDER_ID || envFromRuntimeFile.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || envFromDotEnv.FIREBASE_APP_ID || envFromRuntimeFile.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || envFromDotEnv.FIREBASE_MEASUREMENT_ID || envFromRuntimeFile.FIREBASE_MEASUREMENT_ID,
  };

  if (fromEnv.apiKey && fromEnv.projectId && fromEnv.appId) {
    return fromEnv;
  }

  const prodPath = path.join(root, 'src', 'environments', 'environment.prod.ts');
  const devPath = path.join(root, 'src', 'environments', 'environment.ts');

  return parseFirebaseConfigFromFile(prodPath) || parseFirebaseConfigFromFile(devPath);
}

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    json: argv.includes('--json'),
  };
}

function isDemoId(id) {
  return /^DEMO\d+/i.test(String(id));
}

function normalizeRole(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return 'customer';
  }

  if (['admin', 'administrator', 'super-admin', 'super_admin'].includes(raw)) {
    return 'admin';
  }

  if (['seller', 'vendor', 'merchant'].includes(raw)) {
    return 'seller';
  }

  if (['customer', 'user', 'client', 'buyer'].includes(raw)) {
    return 'customer';
  }

  return 'customer';
}

function toMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {
      return 0;
    }
  }

  if (typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }

  return 0;
}

function pickWinner(records) {
  const scored = records.map((record) => {
    const data = record.data;
    const updatedAt = Math.max(
      toMillis(data.updated_at),
      toMillis(data.last_login),
      toMillis(data.created_at)
    );

    let score = 0;
    if (!isDemoId(record.id)) {
      score += 100;
    }
    if (data.auth_provider) {
      score += 20;
    }
    if (data.status === 'active') {
      score += 10;
    }
    if (data.phone) {
      score += 3;
    }
    if (data.address) {
      score += 2;
    }

    return {
      ...record,
      score,
      updatedAt,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.updatedAt !== a.updatedAt) {
      return b.updatedAt - a.updatedAt;
    }
    return String(a.id).localeCompare(String(b.id));
  });

  return scored[0];
}

function buildUniqueDuplicateEmail(originalEmail, docId, usedEmails) {
  const normalized = String(originalEmail || '').trim().toLowerCase();
  const [localPartRaw, domainRaw] = normalized.split('@');
  const localPart = localPartRaw || 'user';
  const domain = domainRaw || 'dalatfarm.vn';
  const safeDocPart = String(docId).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12) || 'doc';

  let suffix = 0;
  while (true) {
    const tail = suffix === 0 ? safeDocPart : `${safeDocPart}${suffix}`;
    const candidate = `${localPart}+dup-${tail}@${domain}`;
    if (!usedEmails.has(candidate)) {
      usedEmails.add(candidate);
      return candidate;
    }
    suffix += 1;
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const firebaseConfig = loadFirebaseConfig();

  if (!firebaseConfig) {
    console.error('[CRITICAL] Cannot load Firebase config from env vars or environment files.');
    process.exit(2);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const expectedRoleByEmail = {
    'test@example.com': 'admin',
    'admin.stock@dalatfarm.vn': 'admin',
    'seller@dalatfarm.vn': 'seller',
    'customer.a@dalatfarm.vn': 'customer',
    'customer.b@dalatfarm.vn': 'customer',
  };

  const usersSnap = await getDocs(collection(db, 'users'));
  const records = usersSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ref: doc(db, 'users', docSnap.id),
    data: docSnap.data(),
  }));

  const usedEmails = new Set();
  records.forEach((record) => {
    const email = String(record.data.email || '').trim().toLowerCase();
    if (email) {
      usedEmails.add(email);
    }
  });

  const actions = [];

  // Fix role_id values.
  for (const record of records) {
    const email = String(record.data.email || '').trim().toLowerCase();
    const expectedRole = expectedRoleByEmail[email];
    const currentRole = String(record.data.role_id || '').trim().toLowerCase();
    const normalizedRole = expectedRole || normalizeRole(currentRole);

    if (!currentRole || currentRole !== normalizedRole) {
      actions.push({
        type: 'fix-role',
        docId: record.id,
        ref: record.ref,
        patch: {
          role_id: normalizedRole,
          updated_at: serverTimestamp(),
        },
        before: currentRole || '(empty)',
        after: normalizedRole,
      });
    }
  }

  // Fix duplicate emails by keeping one canonical user, re-tagging the others.
  const emailGroups = new Map();
  for (const record of records) {
    const email = String(record.data.email || '').trim().toLowerCase();
    if (!email) {
      continue;
    }

    const group = emailGroups.get(email) || [];
    group.push(record);
    emailGroups.set(email, group);
  }

  for (const [email, group] of emailGroups.entries()) {
    if (group.length <= 1) {
      continue;
    }

    const winner = pickWinner(group);
    const losers = group.filter((item) => item.id !== winner.id);

    for (const loser of losers) {
      const duplicateEmail = buildUniqueDuplicateEmail(email, loser.id, usedEmails);
      actions.push({
        type: 'dedupe-email',
        docId: loser.id,
        ref: loser.ref,
        patch: {
          email: duplicateEmail,
          duplicate_of: winner.id,
          status: loser.data.status || 'active',
          updated_at: serverTimestamp(),
        },
        before: email,
        after: duplicateEmail,
        winner: winner.id,
      });
    }
  }

  let applied = 0;
  if (args.apply) {
    for (const action of actions) {
      await updateDoc(action.ref, action.patch);
      applied += 1;
    }
  }

  const result = {
    mode: args.apply ? 'apply' : 'dry-run',
    usersScanned: records.length,
    plannedActions: actions.length,
    appliedActions: applied,
    roleFixes: actions.filter((item) => item.type === 'fix-role').length,
    duplicateEmailFixes: actions.filter((item) => item.type === 'dedupe-email').length,
    actions: actions.map((item) => ({
      type: item.type,
      docId: item.docId,
      before: item.before,
      after: item.after,
      ...(item.winner ? { winner: item.winner } : {}),
    })),
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('=== Firebase Users Fix ===');
    console.log(`mode: ${result.mode}`);
    console.log(`users scanned: ${result.usersScanned}`);
    console.log(`planned actions: ${result.plannedActions}`);
    console.log(`applied actions: ${result.appliedActions}`);
    console.log(`role fixes: ${result.roleFixes}`);
    console.log(`duplicate email fixes: ${result.duplicateEmailFixes}`);

    if (result.actions.length > 0) {
      console.log('\nChanges:');
      result.actions.forEach((item, index) => {
        const winnerText = item.winner ? ` (winner: ${item.winner})` : '';
        console.log(`  ${index + 1}. [${item.type}] users/${item.docId}: ${item.before} -> ${item.after}${winnerText}`);
      });
    }
  }

  process.exit(0);
}

run().catch((error) => {
  console.error('[CRITICAL] firebase-users-fix failed:', error?.code || error?.message || error);
  process.exit(2);
});
