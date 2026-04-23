const fs = require('fs');
const path = require('path');

function readRuleFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing rule file: ${fileName}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function test(name, passed, detail) {
  return { name, passed, detail };
}

function hasAll(content, parts) {
  return parts.every((part) => content.includes(part));
}

function run() {
  const firestoreRules = readRuleFile('firestore.rules');
  const storageRules = readRuleFile('storage.rules');

  const checks = [];

  checks.push(
    test(
      'Owner-only users write/delete',
      hasAll(firestoreRules, [
        'function isOwner(uid)',
        'request.auth.uid == uid',
        'match /users/{userId}',
        'allow delete: if isOwner(userId);'
      ]),
      'users/{uid} must be protected by uid ownership'
    )
  );

  checks.push(
    test(
      'Block role escalation by owner',
      hasAll(firestoreRules, [
        "request.resource.data.role == resource.data.role",
        "request.resource.data.role_id == resource.data.role_id"
      ]),
      'owner update must not change role or role_id'
    )
  );

  checks.push(
    test(
      'Role helpers support both role and role_id',
      hasAll(firestoreRules, [
        "data.role == 'admin'",
        "data.role_id == 'admin'",
        "data.role == 'seller'",
        "data.role_id == 'seller'"
      ]),
      'rules align with existing app user schema'
    )
  );

  checks.push(
    test(
      'Scoped app_state per uid',
      hasAll(firestoreRules, [
        "docId == ('favorites_user_' + request.auth.uid)",
        "docId == ('cart_user_' + request.auth.uid)",
        "docId == ('orders_user_' + request.auth.uid)"
      ]),
      'favorites/cart/orders must be uid-scoped'
    )
  );

  checks.push(
    test(
      'Admin/seller order read path',
      firestoreRules.includes("allow read: if isSellerOrAdmin() && docId.matches('orders_user_.*');"),
      'seller/admin can read scoped order docs for management'
    )
  );

  checks.push(
    test(
      'Avatar owner-only delete + image constraints',
      hasAll(storageRules, [
        'match /avatars/{userId}/{fileName}',
        'allow delete: if isOwner(userId);',
        "request.resource.contentType.matches('image/.*')"
      ]),
      'avatar path must enforce owner delete and image upload'
    )
  );

  checks.push(
    test(
      'Product media remains compatible with current workflow',
      hasAll(storageRules, [
        'match /products/{productId}/{fileName}',
        'allow create, update: if signedIn()',
        'allow delete: if signedIn();'
      ]),
      'product image path should not block seller/admin flow'
    )
  );

  const scenarioMatrix = [
    {
      scenario: 'User A update users/A',
      expected: 'ALLOW',
      reason: 'owner document'
    },
    {
      scenario: 'User A delete users/B',
      expected: 'DENY',
      reason: 'not owner'
    },
    {
      scenario: 'User A write app_state/orders_user_A',
      expected: 'ALLOW',
      reason: 'uid-scoped doc'
    },
    {
      scenario: 'User A write app_state/orders_user_B',
      expected: 'DENY',
      reason: 'cross-user doc'
    },
    {
      scenario: 'User A delete avatars/A/file.jpg',
      expected: 'ALLOW',
      reason: 'owner avatar'
    },
    {
      scenario: 'User A delete avatars/B/file.jpg',
      expected: 'DENY',
      reason: 'cross-user avatar delete'
    },
    {
      scenario: 'Seller/Admin read app_state/orders_user_X',
      expected: 'ALLOW',
      reason: 'management read path'
    }
  ];

  const passedCount = checks.filter((item) => item.passed).length;
  const failed = checks.filter((item) => !item.passed);

  console.log('=== Firebase Rules Policy Test ===');
  checks.forEach((item, index) => {
    console.log(`${index + 1}. [${item.passed ? 'PASS' : 'FAIL'}] ${item.name}`);
    if (!item.passed) {
      console.log(`   -> ${item.detail}`);
    }
  });

  console.log('\nScenario matrix (quick verify):');
  scenarioMatrix.forEach((row, index) => {
    console.log(`${index + 1}. ${row.scenario} => ${row.expected} (${row.reason})`);
  });

  if (failed.length > 0) {
    console.error(`\nResult: FAIL (${passedCount}/${checks.length} checks passed)`);
    process.exit(1);
  }

  console.log(`\nResult: PASS (${passedCount}/${checks.length} checks passed)`);
}

run();
