import { db } from './db';
import { userProfiles } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface UsageQuota {
  uploadsThisMonth: number;
  maxMonthlyUploads: number;
  needsReset: boolean;
}

export interface QuotaLimits {
  maxPagesPerFile: number;
  monthlyUploadLimit: number;
}

/**
 * Get quota limits based on user tier
 */
export function getQuotaLimits(isPremium: boolean): QuotaLimits {
  return {
    maxPagesPerFile: isPremium ? 100 : 20,
    monthlyUploadLimit: isPremium ? 100 : 3
  };
}

/**
 * Get current usage quota for a user using actual database columns
 */
export async function getUserQuota(userId: string): Promise<UsageQuota> {
  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if it's a new month and reset if needed
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastUpdate = user.updatedAt ? new Date(user.updatedAt) : new Date();
  const needsReset = lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear;

  return {
    uploadsThisMonth: needsReset ? 0 : (user.uploadsThisMonth || 0),
    maxMonthlyUploads: user.maxMonthlyUploads || (user.isPremium ? 100 : 3),
    needsReset
  };
}

/**
 * Reset user quota (typically called monthly)
 */
export async function resetUserQuota(userId: string): Promise<void> {
  await db.update(userProfiles)
    .set({
      uploadsThisMonth: 0,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.id, userId));
}

/**
 * Increment upload count for a user
 */
export async function incrementUploadCount(userId: string, pagesProcessed: number): Promise<void> {
  const quota = await getUserQuota(userId);
  
  if (quota.needsReset) {
    await resetUserQuota(userId);
  }

  await db.update(userProfiles)
    .set({
      uploadsThisMonth: (quota.needsReset ? 0 : quota.uploadsThisMonth) + 1,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.id, userId));
}

/**
 * Check if user can upload a file with given page count
 */
export async function canUserUpload(
  userId: string, 
  pageCount: number
): Promise<{
  canUpload: boolean;
  reason?: string;
  quotaInfo: UsageQuota;
  limits: QuotaLimits;
  pagesWillProcess?: number;
}> {
  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const quota = await getUserQuota(userId);
  const limits = getQuotaLimits(user.isPremium || false);

  // Check upload limit
  if (quota.uploadsThisMonth >= limits.monthlyUploadLimit) {
    return {
      canUpload: false,
      reason: `Monthly upload limit reached (${limits.monthlyUploadLimit} uploads)`,
      quotaInfo: quota,
      limits
    };
  }

  // Calculate pages that will be processed
  let pagesWillProcess = Math.min(pageCount, limits.maxPagesPerFile);

  return {
    canUpload: true,
    quotaInfo: quota,
    limits,
    pagesWillProcess
  };
}

/**
 * Get quota status for UI display
 */
export async function getQuotaStatus(userId: string): Promise<{
  uploads: { used: number; limit: number; percentage: number };
  isPremium: boolean;
  needsReset: boolean;
}> {
  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const quota = await getUserQuota(userId);
  const limits = getQuotaLimits(user.isPremium || false);

  return {
    uploads: {
      used: quota.uploadsThisMonth,
      limit: limits.monthlyUploadLimit,
      percentage: Math.round((quota.uploadsThisMonth / limits.monthlyUploadLimit) * 100)
    },
    isPremium: user.isPremium || false,
    needsReset: quota.needsReset
  };
}