const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { collection, deleteDoc, doc, getDocs, getFirestore, updateDoc, deleteField, serverTimestamp, setDoc } = require('firebase/firestore');

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

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseArgs(argv) {
  const args = {
    shouldFix: false,
    jsonOutput: false,
    jsonFilePath: null,
  };

  argv.forEach((arg) => {
    if (arg === '--fix') {
      args.shouldFix = true;
      return;
    }

    if (arg === '--json') {
      args.jsonOutput = true;
      return;
    }

    if (arg.startsWith('--json-file=')) {
      args.jsonFilePath = arg.slice('--json-file='.length);
      return;
    }

    if (arg === '--json-file') {
      // Handled in next index by caller logic; kept for backwards compatibility.
      args.jsonOutput = true;
    }
  });

  return args;
}

function getStatus(criticals, warnings) {
  if (criticals.length > 0) {
    return 'fail';
  }

  if (warnings.length > 0) {
    return 'warn';
  }

  return 'pass';
}

function printTextReport(result, shouldFix, fixResult) {
  if (shouldFix && fixResult) {
    console.log('=== Firebase Consistency Check (fix mode) ===');
    console.log(`fixed users credential fields: ${fixResult.fixedUsers}`);
    console.log(`deleted legacy app_state docs: ${fixResult.deletedLegacyStateDocs}`);
  } else {
    console.log('=== Firebase Consistency Check ===');
  }

  console.log(`users docs: ${result.usersCount}`);
  console.log(`app_state docs: ${result.appStateCount}`);
  if (typeof result.appStateProductsChunkCount === 'number') {
    console.log(`app_state_products chunk docs: ${result.appStateProductsChunkCount}`);
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
  }

  if (result.criticals.length > 0) {
    console.log('\nCritical issues:');
    result.criticals.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
    return;
  }

  console.log('\nNo critical issues found.');
}

function emitJsonReport(payload, options) {
  if (options.jsonOutput) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (options.jsonFilePath) {
    const outputPath = path.isAbsolute(options.jsonFilePath)
      ? options.jsonFilePath
      : path.join(process.cwd(), options.jsonFilePath);
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[INFO] JSON report written to ${outputPath}`);
  }
}

function isLegacyCredentialDoc(data) {
  return hasOwn(data, 'password') || hasOwn(data, 'password_hash') || hasOwn(data, 'password_salt');
}

async function applySafeFixes(db) {
  let fixedUsers = 0;
  let deletedLegacyStateDocs = 0;
  let repairedProductsMeta = 0;

  const usersSnap = await getDocs(collection(db, 'users'));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (!isLegacyCredentialDoc(data)) {
      continue;
    }

    await updateDoc(userDoc.ref, {
      password: deleteField(),
      password_hash: deleteField(),
      password_salt: deleteField(),
      updated_at: serverTimestamp(),
    });
    fixedUsers += 1;
  }

  const legacyStateIds = ['passwords', 'users'];
  for (const stateId of legacyStateIds) {
    const stateRef = doc(db, 'app_state', stateId);
    try {
      await deleteDoc(stateRef);
      deletedLegacyStateDocs += 1;
    } catch {
      // Ignore delete failures and keep audit output responsible for reporting.
    }
  }

  const appStateSnap = await getDocs(collection(db, 'app_state'));
  const stateIds = appStateSnap.docs.map((docSnap) => docSnap.id);
  const hasChunkedProductsMeta = stateIds.includes('products_meta_v2');
  if (!hasChunkedProductsMeta) {
    const chunksSnap = await getDocs(collection(db, 'app_state_products'));
    if (chunksSnap.size > 0) {
      await setDoc(doc(db, 'app_state', 'products_meta_v2'), {
        value: {
          version: 1,
          chunkCount: chunksSnap.size,
        },
        updatedAt: Date.now(),
      });
      repairedProductsMeta = 1;
    }
  }

  return {
    fixedUsers,
    deletedLegacyStateDocs,
    repairedProductsMeta,
  };
}

async function audit(db) {
  const criticals = [];
  const warnings = [];

  const usersSnap = await getDocs(collection(db, 'users'));
  const appStateSnap = await getDocs(collection(db, 'app_state'));
  const appStateProductsChunkSnap = await getDocs(collection(db, 'app_state_products'));

  const seenEmails = new Map();

  usersSnap.forEach((docSnap) => {
    const id = docSnap.id;
    const data = docSnap.data();

    if (isLegacyCredentialDoc(data)) {
      criticals.push(`users/${id} still contains legacy credential fields`);
    }

    if (!data.email) {
      criticals.push(`users/${id} missing email`);
    } else {
      const normalized = String(data.email).toLowerCase();
      const existing = seenEmails.get(normalized);
      if (existing && existing !== id) {
        criticals.push(`duplicate email detected: ${normalized} on users/${existing} and users/${id}`);
      } else {
        seenEmails.set(normalized, id);
      }
    }

    if (!data.role_id || !['admin', 'customer', 'seller'].includes(String(data.role_id))) {
      warnings.push(`users/${id} has unusual role_id: ${String(data.role_id)}`);
    }

    if (data.id && String(data.id) !== id) {
      warnings.push(`users/${id} has mismatched id field value: ${String(data.id)}`);
    }
  });

  const stateIds = [];

  appStateSnap.forEach((docSnap) => {
    const id = docSnap.id;
    const data = docSnap.data();
    stateIds.push(id);

    if (!hasOwn(data, 'value')) {
      criticals.push(`app_state/${id} missing value field`);
    }

    if (id === 'passwords') {
      warnings.push('app_state/passwords exists (legacy key). Consider deleting if unused');
    }

    if (id === 'users') {
      warnings.push('app_state/users exists (legacy key). Consider deleting if unused');
    }

    if (id === 'cart' && stateIds.some((key) => key.startsWith('cart_user_') || key.startsWith('cart_guest_'))) {
      warnings.push('both global cart and scoped cart_user_/cart_guest_ keys exist');
    }
  });

  const hasLegacyProductsDoc = stateIds.includes('products');
  const hasChunkedProductsMeta = stateIds.includes('products_meta_v2');

  if (!hasLegacyProductsDoc && !hasChunkedProductsMeta) {
    if (appStateProductsChunkSnap.size > 0) {
      criticals.push('app_state_products has chunk documents but app_state/products_meta_v2 is missing');
    } else {
      criticals.push('Neither app_state/products nor app_state/products_meta_v2 exists');
    }
  }

  if (hasChunkedProductsMeta && appStateProductsChunkSnap.size === 0) {
    criticals.push('app_state/products_meta_v2 exists but app_state_products has no chunk documents');
  }

  if (hasLegacyProductsDoc && hasChunkedProductsMeta) {
    warnings.push('Both legacy app_state/products and chunked app_state/products_meta_v2 exist');
  }

  return {
    usersCount: usersSnap.size,
    appStateCount: appStateSnap.size,
    appStateProductsChunkCount: appStateProductsChunkSnap.size,
    warnings,
    criticals,
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const shouldFix = args.shouldFix;

  const jsonFileFlagIndex = process.argv.findIndex((arg) => arg === '--json-file');
  if (jsonFileFlagIndex !== -1 && process.argv[jsonFileFlagIndex + 1]) {
    args.jsonFilePath = process.argv[jsonFileFlagIndex + 1];
  }

  if (args.jsonFilePath) {
    args.jsonOutput = true;
  }

  const firebaseConfig = loadFirebaseConfig();
  if (!firebaseConfig) {
    console.error('[CRITICAL] Cannot load Firebase config from env vars or environment files.');
    process.exit(2);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  let fixResult = null;

  if (shouldFix) {
    fixResult = await applySafeFixes(db);
  }

  const result = await audit(db);
  const status = getStatus(result.criticals, result.warnings);

  const report = {
    tool: 'firebase-consistency-check',
    timestamp: new Date().toISOString(),
    status,
    mode: shouldFix ? 'fix' : 'check',
    summary: {
      usersDocs: result.usersCount,
      appStateDocs: result.appStateCount,
      appStateProductsChunkDocs: result.appStateProductsChunkCount,
      warningCount: result.warnings.length,
      criticalCount: result.criticals.length,
    },
    warnings: result.warnings,
    criticals: result.criticals,
    ...(fixResult ? { fix: fixResult } : {}),
  };

  printTextReport(result, shouldFix, fixResult);
  emitJsonReport(report, args);

  process.exit(status === 'fail' ? 1 : 0);
}

run().catch((error) => {
  console.error('[CRITICAL] Consistency check failed to execute:', error.code || error.message || error);
  const args = parseArgs(process.argv.slice(2));
  const report = {
    tool: 'firebase-consistency-check',
    timestamp: new Date().toISOString(),
    status: 'fail',
    mode: args.shouldFix ? 'fix' : 'check',
    summary: {
      usersDocs: 0,
      appStateDocs: 0,
      warningCount: 0,
      criticalCount: 1,
    },
    warnings: [],
    criticals: [`execution failure: ${error.code || error.message || String(error)}`],
  };
  emitJsonReport(report, {
    jsonOutput: args.jsonOutput || Boolean(args.jsonFilePath),
    jsonFilePath: args.jsonFilePath,
  });
  process.exit(2);
});
