const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

const parseEnv = (content) => {
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
};

const readEnv = () => {
  if (!fs.existsSync(envPath)) {
    throw new Error('.env not found. Create .env before running this check.');
  }

  return parseEnv(fs.readFileSync(envPath, 'utf8'));
};

const truncate = (value, max = 220) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const prettyResult = (name, status, details) => {
  const icon = status === 'PASS' ? 'OK' : status === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`${icon}  ${name}: ${status}`);
  if (details) {
    console.log(`    ${details}`);
  }
};

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: truncate(text) };
  }
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await safeJson(response);
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const findDemoCredentials = async (apiKey, passwordFromEnv) => {
  const candidatePasswords = [passwordFromEnv, '123456', '12345678']
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  const candidates = [
    'admin.stock@dalatfarm.vn',
    'test@example.com',
    'seller@dalatfarm.vn',
  ];

  for (const email of candidates) {
    for (const password of candidatePasswords) {
      const result = await requestJson(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      if (result.ok) {
        return {
          email,
          password,
          idToken: result.payload.idToken,
          localId: result.payload.localId,
        };
      }
    }
  }

  return null;
};

const checkAuth = async (apiKey, passwordFromEnv) => {
  const creds = await findDemoCredentials(apiKey, passwordFromEnv);

  if (!creds) {
    prettyResult('Auth sign-in', 'FAIL', 'Cannot sign in with demo accounts. Check DEMO_ACCOUNT_PASSWORD or user seed data.');
    return null;
  }

  prettyResult('Auth sign-in', 'PASS', `Signed in as ${creds.email}`);
  return creds;
};

const checkFirestore = async (projectId, apiKey, idToken) => {
  const getProductsMetaUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/app_state/products_meta_v2?key=${apiKey}`;
  const getProductsMeta = await requestJson(getProductsMetaUrl);

  if (getProductsMeta.ok) {
    prettyResult('Firestore read app_state/products_meta_v2', 'PASS', `HTTP ${getProductsMeta.status}`);
  } else {
    const getLegacyProductsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/app_state/products?key=${apiKey}`;
    const getLegacyProducts = await requestJson(getLegacyProductsUrl);

    if (getLegacyProducts.ok) {
      prettyResult('Firestore read app_state/products (legacy)', 'PASS', `HTTP ${getLegacyProducts.status}`);
    } else {
      prettyResult(
        'Firestore products state',
        'WARN',
        `chunked HTTP ${getProductsMeta.status}, legacy HTTP ${getLegacyProducts.status}`
      );
    }
  }

  const diagDocId = `diag_health_${Date.now()}`;
  const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/app_state/${diagDocId}`;
  const patchBody = {
    fields: {
      value: { stringValue: 'firebase-health-check' },
      updatedAt: { integerValue: String(Date.now()) },
    },
  };

  const patchRes = await requestJson(patchUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(patchBody),
  });

  if (patchRes.ok) {
    prettyResult('Firestore write app_state/diag', 'PASS', `HTTP ${patchRes.status}`);
  } else {
    prettyResult('Firestore write app_state/diag', 'FAIL', `HTTP ${patchRes.status} ${truncate(JSON.stringify(patchRes.payload))}`);
  }
};

const checkStorageForBucket = async (bucket, idToken) => {
  const encodedName = encodeURIComponent(`diag/health-${Date.now()}.txt`);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedName}`;

  const unauthUpload = await requestJson(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'guest-check',
  });

  const authUpload = await requestJson(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      Authorization: `Bearer ${idToken}`,
    },
    body: 'auth-check',
  });

  return { bucket, unauthUpload, authUpload };
};

const checkStorage = async (projectId, bucketFromEnv, idToken, storageRequired) => {
  const bucketCandidates = [
    bucketFromEnv,
    `${projectId}.appspot.com`,
    `${projectId}.firebasestorage.app`,
  ].filter(Boolean);

  const uniqueBuckets = [...new Set(bucketCandidates)];
  let foundReachableBucket = false;

  for (const bucket of uniqueBuckets) {
    const result = await checkStorageForBucket(bucket, idToken);
    const unauth = result.unauthUpload;
    const auth = result.authUpload;

    if (auth.ok || auth.status !== 404 || unauth.status !== 404) {
      foundReachableBucket = true;
    }

    if (auth.status === 404 && unauth.status === 404) {
      prettyResult(`Storage bucket ${bucket}`, 'WARN', 'Bucket endpoint returned 404. Check FIREBASE_STORAGE_BUCKET and ensure Firebase Storage is enabled in Firebase Console.');
      continue;
    }

    const unauthStatus = unauth.ok ? 'ALLOW' : `DENY(${unauth.status})`;
    const authStatus = auth.ok ? 'ALLOW' : `DENY(${auth.status})`;
    prettyResult(`Storage rules ${bucket}`, 'PASS', `guest=${unauthStatus}, auth=${authStatus}`);

    if (!auth.ok) {
      prettyResult(
        `Storage auth upload detail ${bucket}`,
        'WARN',
        truncate(JSON.stringify(auth.payload))
      );
    }
  }

  if (!foundReachableBucket) {
    if (storageRequired) {
      prettyResult('Storage overall', 'FAIL', 'No reachable bucket endpoint found from env/project naming candidates.');
      return false;
    }

    prettyResult('Storage overall', 'WARN', 'No reachable bucket endpoint found. Skipping failure because FIREBASE_STORAGE_REQUIRED=false.');
    return true;
  }

  prettyResult('Storage overall', 'PASS', 'Reachable bucket endpoint detected.');
  return true;
};

const main = async () => {
  try {
    const env = readEnv();
    const apiKey = env.FIREBASE_API_KEY;
    const projectId = env.FIREBASE_PROJECT_ID;
    const bucket = env.FIREBASE_STORAGE_BUCKET;
    const storageRequired = String(env.FIREBASE_STORAGE_REQUIRED || 'true').toLowerCase() === 'true';

    if (!apiKey || !projectId) {
      throw new Error('Missing FIREBASE_API_KEY or FIREBASE_PROJECT_ID in .env');
    }

    console.log('Firebase Health Check');
    console.log('---------------------');
    console.log(`Project: ${projectId}`);
    console.log(`Bucket (env): ${bucket || '(empty)'}`);

    const creds = await checkAuth(apiKey, env.DEMO_ACCOUNT_PASSWORD);
    if (!creds) {
      process.exitCode = 1;
      return;
    }

    await checkFirestore(projectId, apiKey, creds.idToken);
    const storageOk = await checkStorage(projectId, bucket, creds.idToken, storageRequired);
    if (!storageOk) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('FAIL  Health check script crashed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

main();
