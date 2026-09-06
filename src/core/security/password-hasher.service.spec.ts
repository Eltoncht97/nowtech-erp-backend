import { needsRehash } from 'argon2';
import { PasswordHasher } from './password-hasher.service';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();
  it('salts each hash and verifies the exact Unicode password', async () => {
    const password = ' Una contraseña 🔐 larga ';
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);
    expect(first).toMatch(/^\$argon2id\$/);
    expect(
      needsRehash(first, {
        memoryCost: 19 * 1024,
        timeCost: 2,
        parallelism: 1,
      }),
    ).toBe(false);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    await expect(hasher.verify(password, first)).resolves.toBe(true);
    await expect(hasher.verify(password, second)).resolves.toBe(true);
    await expect(hasher.verify(password.trim(), first)).resolves.toBe(false);
    await expect(hasher.verify('wrong password', first)).resolves.toBe(false);
  });

  it.each([
    null,
    undefined,
    '',
    'plaintext',
    '$argon2id$',
    '$argon2id$v=19$m=19456,t=2,p=1$invalid$invalid',
  ])('rejects missing or malformed stored hashes: %s', async (value) => {
    await expect(hasher.verify('password', value)).resolves.toBe(false);
  });
});
