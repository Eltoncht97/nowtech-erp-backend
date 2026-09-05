import { PasswordHasher } from './password-hasher.service';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();
  it('salts each hash and verifies the exact Unicode password', async () => {
    const password = ' Una contraseña 🔐 larga ';
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);
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
    'scrypt$v1$999999999$8$1$aa$bb',
    `scrypt$v1$131072$8$1$${'a'.repeat(32)}$${'z'.repeat(128)}`,
  ])('rejects missing or malformed stored hashes: %s', async (value) => {
    await expect(hasher.verify('password', value)).resolves.toBe(false);
  });
});
