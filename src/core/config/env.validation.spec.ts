import { envValidationSchema } from './env.validation';

describe('environment validation', () => {
  const env = { DATABASE_URL: 'postgresql://localhost/test' };
  it.each([undefined, ''])(
    'requires JWT_SECRET, including in test mode: %s',
    (secret) => {
      expect(
        envValidationSchema.validate({
          ...env,
          NODE_ENV: 'test',
          JWT_SECRET: secret,
        }).error,
      ).toBeDefined();
    },
  );
  it('accepts an explicitly configured JWT_SECRET', () => {
    expect(
      envValidationSchema.validate({ ...env, JWT_SECRET: 'test-only-secret' })
        .error,
    ).toBeUndefined();
  });
});
