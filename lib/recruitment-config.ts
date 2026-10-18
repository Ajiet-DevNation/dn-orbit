import { db } from "@/lib/db";

/** Whether the admin switch is on. A missing singleton row means closed. */
export async function isRecruitmentOpen(): Promise<boolean> {
  const config = await db.recruitmentConfig.findUnique({ where: { id: 1 } });
  return config?.isOpen ?? false;
}
