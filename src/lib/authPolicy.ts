const MIN_ADMIN_PASSWORD_LENGTH = 15;
const MAX_ADMIN_PASSWORD_LENGTH = 128;

export function isValidAdminPassword(password: unknown): password is string {
  return typeof password === 'string' &&
    password.length >= MIN_ADMIN_PASSWORD_LENGTH &&
    password.length <= MAX_ADMIN_PASSWORD_LENGTH;
}