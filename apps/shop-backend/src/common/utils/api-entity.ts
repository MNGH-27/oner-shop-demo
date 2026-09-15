export function apiEntity<T extends { id: string }>(value: T) {
  return { ...value, _id: value.id };
}
export function withoutPassword<T extends { id: string; password?: string }>(
  value: T,
) {
  const { password, ...safe } = value;
  void password;
  return apiEntity(safe as Omit<T, 'password'> & { id: string });
}
