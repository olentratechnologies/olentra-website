// Read results belong to the verified account and its current authorization.
export function internQueryScope(account) {
  if (!account) return "anonymous";
  return JSON.stringify([
    account.id,
    account.role,
    account.sessionVersion,
    account.staffRole,
    [...(account.permissions || [])].sort(),
  ]);
}
