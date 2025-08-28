// Central place for storage bucket names.
export const BUCKETS = { AVATARS: 'user-photos' } as const;
export const userAvatarPath = (userId: string) =>
  `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;