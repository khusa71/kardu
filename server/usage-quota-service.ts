import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface UsageQuota {
  monthlyUploads: number;
  monthlyPagesProcessed: number;
  monthlyLimit: number;
  lastResetDate: Date;
  needsReset: boolean;
}

export interface QuotaLimits {
  maxPagesPerFile: number;
  monthlyPageLimit: number;
  monthlyUploadLimit: number;
}

/**
 * Get quota limits based on user tier
 */
export function getQuotaLimits(isPremium: boolean): QuotaLimits {
  return {
    maxPagesPerFile: isPremium ? 100 : 20,
    monthlyPageLimit: isPremium ? 10000 : 60, // 20 pages * 3 uploads for free
    monthlyUploadLimit: isPremium ? 100 : 3
  };
}

/**
 * Get current usage quota for a user
 */
export async function getUserQuota(userId: string): Promise<UsageQuota> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastReset = user.lastResetDate || new Date();
  const needsReset = shouldResetQuota(lastReset, now);

  return {
    monthlyUploads: needsReset ? 0 : (user.monthlyUploads || 0),
    monthlyPagesProcessed: needsReset ? 0 : (user.monthlyPagesProcessed || 0),
    monthlyLimit: user.monthlyLimit || (user.isPremium ? 100 : 3),
    lastResetDate: lastReset,
    needsReset
  };
}

/**
 * Check if quota should be reset (monthly)
 */
function shouldResetQuota(lastResetDate: Date, currentDate: Date): boolean {
  const lastReset = new Date(lastResetDate);
  const now = new Date(currentDate);
  
  // Reset if it's been more than a month
  const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                    (now.getMonth() - lastReset.getMonth());
  
  return monthsDiff >= 1;
}

/**
 * Reset user quota (typically called monthly)
 */
export async function resetUserQuota(userId: string): Promise<void> {
  await db.update(users)
    .set({
      monthlyUploads: 0,
      monthlyPagesProcessed: 0,
      lastResetDate: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}

/**
 * Increment upload count for a user
 */
export async function incrementUploadCount(userId: string, pagesProcessed: number): Promise<void> {
  const quota = await getUserQuota(userId);
  
  if (quota.needsReset) {
    await resetUserQuota(userId);
  }

  await db.update(users)
    .set({
      monthlyUploads: (quota.needsReset ? 0 : quota.monthlyUploads) + 1,
      monthlyPagesProcessed: (quota.needsReset ? 0 : quota.monthlyPagesProcessed) + pagesProcessed,
      lastUploadDate: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
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
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const quota = await getUserQuota(userId);
  const limits = getQuotaLimits(user.isPremium || false);

  // Check upload limit
  if (quota.monthlyUploads >= limits.monthlyUploadLimit) {
    return {
      canUpload: false,
      reason: `Monthly upload limit reached (${limits.monthlyUploadLimit} uploads)`,
      quotaInfo: quota,
      limits
    };
  }

  // Calculate pages that will be processed
  let pagesWillProcess = Math.min(pageCount, limits.maxPagesPerFile);
  
  // Check monthly page limit
  const remainingPages = limits.monthlyPageLimit - quota.monthlyPagesProcessed;
  if (remainingPages <= 0) {
    return {
      canUpload: false,
      reason: `Monthly page limit reached (${limits.monthlyPageLimit} pages)`,
      quotaInfo: quota,
      limits
    };
  }

  // Limit to remaining pages if necessary
  pagesWillProcess = Math.min(pagesWillProcess, remainingPages);

  if (pagesWillProcess <= 0) {
    return {
      canUpload: false,
      reason: `No pages remaining in monthly quota`,
      quotaInfo: quota,
      limits
    };
  }

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
  pages: { used: number; limit: number; percentage: number };
  isPremium: boolean;
  needsReset: boolean;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const quota = await getUserQuota(userId);
  const limits = getQuotaLimits(user.isPremium || false);

  return {
    uploads: {
      used: quota.monthlyUploads,
      limit: limits.monthlyUploadLimit,
      percentage: Math.round((quota.monthlyUploads / limits.monthlyUploadLimit) * 100)
    },
    pages: {
      used: quota.monthlyPagesProcessed,
      limit: limits.monthlyPageLimit,
      percentage: Math.round((quota.monthlyPagesProcessed / limits.monthlyPageLimit) * 100)
    },
    isPremium: user.isPremium || false,
    needsReset: quota.needsReset
  };
}