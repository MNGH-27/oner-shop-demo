import type { MongoId } from '../types/common'

export function entityId(entity: { _id?: MongoId; id?: MongoId } | string): string {
  if (typeof entity === 'string') return entity
  return entity.id ?? entity._id ?? ''
}

export function parentId(
  parent: MongoId | { _id: MongoId } | null | undefined,
): string | null {
  if (!parent) return null
  if (typeof parent === 'string') return parent
  return parent._id
}

export function categoryName(
  category: MongoId | { name: string } | null | undefined,
): string {
  if (!category) return '—'
  if (typeof category === 'string') return category
  return category.name
}
