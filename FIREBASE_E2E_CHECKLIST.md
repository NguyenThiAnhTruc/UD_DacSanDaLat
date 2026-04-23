# Firebase End-to-End Checklist

Date: 2026-03-15
Environment: local development (`http://127.0.0.1:4202`)

## Summary

- Auth-related flows are code-ready but blocked by Firebase Auth provider configuration in Firebase Console.
- Firestore-backed flows are passing via automated smoke tests.
- Data scope hardening is implemented to avoid cross-user state leaks.

## Checklist

| Flow | Test Item | Result | Evidence |
|---|---|---|---|
| Login/Register | Create user with Firebase Authentication (email/password) | FAIL | Firebase returned `auth/configuration-not-found` |
| Login/Register | Sign in with Firebase Authentication | FAIL | Blocked by provider configuration |
| Login/Register | Send password reset email | FAIL | Blocked by provider configuration |
| Favorites | Write/read user-scoped favorites doc (`app_state/favorites_user_<uid>`) | PASS | Firestore smoke test success |
| Cart | Write/read user-scoped cart doc (`app_state/cart_user_<uid>`) | PASS | Firestore smoke test success |
| Orders | Write/read user-scoped orders doc (`app_state/orders_user_<uid>`) | PASS | Firestore smoke test success |
| Profile | Write/read profile doc in `users/<uid>` | PASS | Firestore smoke test success |
| Profile | Update profile fields in `users/<uid>` | PASS | Firestore smoke test success |
| Profile | Change password through Firebase Authentication | FAIL | Blocked by provider configuration |
| Profile | Delete account via Firebase Authentication + remove profile doc | FAIL | Blocked by provider configuration |

## Required Firebase Console Setup

Enable providers in Firebase Console:

1. Go to Firebase Console -> Authentication -> Sign-in method.
2. Enable `Email/Password` provider.
3. Enable `Google` provider if Google login is required.
4. Add local test origins in Authorized domains if needed (`localhost`, `127.0.0.1`).

After enabling providers, rerun this checklist to verify all auth flows pass.
