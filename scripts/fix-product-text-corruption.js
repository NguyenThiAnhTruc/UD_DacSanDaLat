const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { collection, doc, getDocs, getFirestore, setDoc } = require('firebase/firestore');

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

const canonicalById = new Map([
  [1, { name: 'Dâu Tây Đà Lạt', category: 'Trái cây', origin: 'Đà Lạt, Lâm Đồng', description: 'Dâu tây Đà Lạt tươi ngon, vị thanh ngọt, thu hoạch mới mỗi ngày.', farmName: 'Nông trại Hoa Lan', farmerName: 'Anh Nguyễn Văn A', farmerExperience: '15 năm kinh nghiệm trồng dâu' }],
  [2, { name: 'Atiso Đà Lạt', category: 'Rau củ', origin: 'Đà Lạt, Lâm Đồng', description: 'Atiso tươi, đặc sản Đà Lạt nổi tiếng với nhiều công dụng cho sức khỏe.', farmName: 'HTX Atiso Đà Lạt', farmerName: 'Chị Trần Thị B', farmerExperience: '20 năm trồng atiso' }],
  [3, { name: 'Cà Phê Arabica', category: 'Cà phê', origin: 'Đà Lạt, Lâm Đồng', description: 'Cà phê Arabica Đà Lạt rang xay nguyên chất, hương thơm đậm và hậu vị dịu.' }],
  [4, { name: 'Bơ Đà Lạt', category: 'Trái cây', origin: 'Đà Lạt, Lâm Đồng', description: 'Bơ Đà Lạt dẻo béo, cơm dày, phù hợp làm sinh tố và món ăn healthy.' }],
  [5, { name: 'Sữa Bò Đà Lạt', category: 'Sữa', origin: 'Đà Lạt, Lâm Đồng', description: 'Sữa bò Đà Lạt tươi sạch, vị thanh tự nhiên, bổ sung năng lượng mỗi ngày.' }],
  [6, { name: 'Rau Xà Lách', category: 'Rau củ', origin: 'Đà Lạt, Lâm Đồng', description: 'Xà lách Đà Lạt giòn mát, sạch an toàn, lý tưởng cho salad và món cuốn.' }],
  [7, { name: 'Hoa Hồng Đà Lạt', category: 'Hoa', origin: 'Đà Lạt, Lâm Đồng', description: 'Hoa hồng Đà Lạt tươi lâu, màu đẹp, phù hợp làm quà tặng và trang trí.' }],
  [8, { name: 'Măng Tây Đà Lạt', category: 'Rau củ', origin: 'Đà Lạt, Lâm Đồng', description: 'Măng tây Đà Lạt non ngon, giàu chất xơ, hợp cho bữa ăn cân bằng.' }],
  [9, { name: 'Mật Ong Rừng', category: 'Thực phẩm', origin: 'Đà Lạt, Lâm Đồng', description: 'Mật ong rừng nguyên chất, hương thơm tự nhiên, dùng tốt cho sức khỏe.' }],
  [10, { name: 'Bắp Cải Tím', category: 'Rau củ', origin: 'Đà Lạt, Lâm Đồng', description: 'Bắp cải tím Đà Lạt tươi giòn, màu đẹp, dễ chế biến nhiều món ăn.' }],
  [11, { name: 'Dứa Đà Lạt', category: 'Trái cây', origin: 'Đà Lạt, Lâm Đồng', description: 'Dứa Đà Lạt ngọt thơm, nhiều nước, giàu vitamin C cho đề kháng.' }],
  [12, { name: 'Trà Ô Long', category: 'Trà', origin: 'Đà Lạt, Lâm Đồng', description: 'Trà ô long Đà Lạt cao cấp, hương thơm thanh, vị hậu ngọt dễ chịu.' }],
]);

async function main() {
  const env = parseEnv(fs.readFileSync('.env', 'utf8'));
  const app = initializeApp({
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
  });
  const db = getFirestore(app);

  const snap = await getDocs(collection(db, 'app_state_products'));
  let touchedProducts = 0;

  for (const chunkDoc of snap.docs) {
    const data = chunkDoc.data();
    const products = Array.isArray(data.value) ? data.value : [];

    const nextProducts = products.map((product) => {
      const canonical = canonicalById.get(Number(product?.id));
      if (!canonical) {
        return product;
      }

      touchedProducts += 1;
      const next = {
        ...product,
        name: canonical.name,
        category: canonical.category,
        origin: canonical.origin,
        description: canonical.description,
      };

      if (canonical.farmName) {
        next.farmName = canonical.farmName;
      }

      if (next.farmerInfo && (canonical.farmerName || canonical.farmerExperience)) {
        next.farmerInfo = {
          ...next.farmerInfo,
          ...(canonical.farmerName ? { name: canonical.farmerName } : {}),
          ...(canonical.farmerExperience ? { experience: canonical.farmerExperience } : {}),
        };
      }

      return next;
    });

    await setDoc(doc(db, 'app_state_products', chunkDoc.id), {
      ...data,
      value: nextProducts,
      updatedAt: Date.now(),
    });
  }

  console.log(`UPDATED_PRODUCTS:${touchedProducts}`);
}

main().catch((error) => {
  console.error('FIX_PRODUCT_TEXT_FAILED', error);
  process.exitCode = 1;
});
