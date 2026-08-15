export interface Banner { _id: string; title: string; subtitle?: string; image: string; isActive: boolean }
export type BannerPayload = Omit<Banner, '_id'>
