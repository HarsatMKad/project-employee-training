import {
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from './security.js';

describe('session security', () => {
  it('stores passwords as salted hashes and checks the original password', () => {
    const storedHash = hashPassword('Demo123!');

    expect(storedHash).not.toContain('Demo123!');
    expect(storedHash).toMatch(/^scrypt\$/);
    expect(verifyPassword('Demo123!', storedHash)).toBe(true);
    expect(verifyPassword('wrong-password', storedHash)).toBe(false);
  });

  it('signs a role-bearing session token and rejects tampering', () => {
    const user = {
      id: 'employee-1',
      email: 'employee@example.test',
      name: 'Test Employee',
      role: 'employee' as const,
      organizationId: 'org-1',
    };
    const token = signSessionToken(user);

    expect(verifySessionToken(token)).toEqual(user);
    expect(verifySessionToken(`${token.slice(0, -1)}x`)).toBeUndefined();
    expect(verifySessionToken('not-a-jwt')).toBeUndefined();
  });
});
