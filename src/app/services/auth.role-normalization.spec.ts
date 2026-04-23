import { AuthService } from './auth.service';

describe('AuthService - Role Normalization', () => {
  let service: AuthService;

  beforeEach(() => {
    // Create a lightweight instance without running constructor to avoid Firebase init in unit tests.
    service = Object.create(AuthService.prototype) as AuthService;
  });

  it('should resolve admin from role_id', () => {
    const role = (service as any).resolveRoleFromRecord({ role_id: 'admin' });
    expect(role).toBe('admin');
  });

  it('should resolve seller from role_id', () => {
    const role = (service as any).resolveRoleFromRecord({ role_id: 'seller' });
    expect(role).toBe('seller');
  });

  it('should resolve admin from role when role_id is missing', () => {
    const role = (service as any).resolveRoleFromRecord({ role: 'admin' });
    expect(role).toBe('admin');
  });

  it('should resolve seller from roleId when role_id and role are missing', () => {
    const role = (service as any).resolveRoleFromRecord({ roleId: 'seller' });
    expect(role).toBe('seller');
  });

  it('should normalize uppercase and surrounding spaces', () => {
    const role = (service as any).resolveRoleFromRecord({ role: '  ADMIN  ' });
    expect(role).toBe('admin');
  });

  it('should prefer role_id over role if both are present', () => {
    const role = (service as any).resolveRoleFromRecord({ role_id: 'seller', role: 'admin' });
    expect(role).toBe('seller');
  });

  it('should fallback to customer for unknown role', () => {
    const role = (service as any).resolveRoleFromRecord({ role: 'moderator' });
    expect(role).toBe('customer');
  });

  it('should fallback to customer for null/undefined record', () => {
    const fromNull = (service as any).resolveRoleFromRecord(null);
    const fromUndefined = (service as any).resolveRoleFromRecord(undefined);

    expect(fromNull).toBe('customer');
    expect(fromUndefined).toBe('customer');
  });
});