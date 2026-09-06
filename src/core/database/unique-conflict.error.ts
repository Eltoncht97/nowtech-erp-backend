export class UniqueConflictError extends Error {
  constructor(readonly field: 'email' | 'slug') {
    super(`${field} already exists`);
  }
}
