import { apiEntity, withoutPassword } from './api-entity';

describe('API entity helpers', () => {
  it('exposes a backward-compatible _id field', () => {
    expect(apiEntity({ id: 'entity-id', name: 'Oner' })).toEqual({
      id: 'entity-id',
      _id: 'entity-id',
      name: 'Oner',
    });
  });

  it('never exposes a user password', () => {
    const result = withoutPassword({
      id: 'user-id',
      email: 'user@example.com',
      password: 'secret',
    });

    expect(result).toEqual({
      id: 'user-id',
      _id: 'user-id',
      email: 'user@example.com',
    });
    expect(result).not.toHaveProperty('password');
  });
});
