const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { collection, getDocs, getFirestore } = require('firebase/firestore');

function parseEnv(content) {
  const out = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return;
    }
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
    out[key] = value;
  });
  return out;
}

function looksCorrupted(value) {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.includes('�')) {
    return true;
  }
  return value.includes('?') && /[A-Za-z]/.test(value);
}

async function main() {
  const envRaw = fs.readFileSync('.env', 'utf8');
  const env = parseEnv(envRaw);

  const app = initializeApp({
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
  });

  const db = getFirestore(app);
  const chunksSnap = await getDocs(collection(db, 'app_state_products'));

  let totalRows = 0;
  let brokenRows = 0;
  const samples = [];

  chunksSnap.forEach((docSnap) => {
    const value = docSnap.data().value;
    const products = Array.isArray(value) ? value : [];

    products.forEach((product) => {
      totalRows += 1;
      const fields = [
        product?.name,
        product?.description,
        product?.category,
        product?.origin,
        product?.farmName,
        product?.farmerInfo?.name,
        product?.farmerInfo?.experience,
      ];

      if (fields.some(looksCorrupted)) {
        brokenRows += 1;
        if (samples.length < 3) {
          samples.push({
            id: product?.id,
            name: product?.name,
            category: product?.category,
            origin: product?.origin,
            description: product?.description,
          });
        }
      }
    });
  });

  console.log(`PRODUCT_ROWS:${totalRows}`);
  console.log(`BROKEN_TEXT_ROWS:${brokenRows}`);
  if (samples.length > 0) {
    console.log('BROKEN_SAMPLES:');
    samples.forEach((sample, index) => {
      console.log(`${index + 1}. id=${sample.id}`);
      console.log(`   name=${sample.name}`);
      console.log(`   category=${sample.category}`);
      console.log(`   origin=${sample.origin}`);
      console.log(`   description=${sample.description}`);
    });
  }
}

main().catch((error) => {
  console.error('TEXT_QUALITY_CHECK_FAILED', error);
  process.exitCode = 1;
});
