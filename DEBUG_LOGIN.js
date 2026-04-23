#!/usr/bin/env node
/**
 * Công cụ Debug - Kiểm Tra Firestore Kết Nối
 * Chạy lệnh: node debug-firebase.js
 * 
 * Hoặc paste code này vào Browser Console (F12 → Console)
 */

// Nếu chạy trên browser, thêm vào console:
const debugFirebase = () => {
  console.clear();
  console.log('🔍 DEBUG FIREBASE LOGIN\n');

  // 1. Kiểm tra Firebase Config
  console.log('📋 1. FIREBASE CONFIG:');
  const config = {
    apiKey: 'AIzaSyAXhbetCKabH7fZ8z6mswCZfWU5jNjfyc8',
    authDomain: 'dacsandl-83208.firebaseapp.com',
    projectId: 'dacsandl-83208',
  };
  console.log(JSON.stringify(config, null, 2));

  // 2. Kiểm tra Local Storage
  console.log('\n🗄️ 2. LOCAL STORAGE (Demo Accounts):');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('dalatfarm') || key?.includes('firebase')) {
      console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
    }
  }

  // 3. Kiểm tra Network Request
  console.log('\n🌐 3. HỮ GỢI Ý - Nhấn F12 → Network tab, thử đăng nhập lại, tìm request:');
  console.log('  • Cần tìm POST request đến identitytoolkit.googleapis.com');
  console.log('  • Response status = 400 → Chi tiết lỗi sẽ ở trong response');

  // 4. Kiểm tra Application Tab
  console.log('\n📱 4. KIỂM TRA APPLICATION (F12):');
  console.log('  • Application tab → Firestore Database');
  console.log('  • Xem Collection "users" có data không');
  console.log('  • Nếu trống → Tài khoản demo chưa được tạo!');

  // 5. Lý do có thể gây 400
  console.log('\n⚠️ 5. CÁC LÝ DO THƯỜNG GẤY 400:');
  console.log('  a) Tài khoản email chưa tồn tại trong Firestore');
  console.log('  b) Firebase Auth provider (Email/Password) chưa được bật');
  console.log('  c) Firestore Security Rules bị chặn anonymous requests');
  console.log('  d) Request bị malformed (từ phía client)');
};

// Nếu là Node.js script
if (typeof window === 'undefined') {
  console.log('💡 Dùng lệnh này trên Browser Console (F12):\n');
  console.log('const debugFirebase = ' + debugFirebase.toString() + ';\ndebugFirebase();');
} else {
  // Browser environment
  debugFirebase();
}
