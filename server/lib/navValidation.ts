import { db } from "../db";
import { projectNavHistory } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface CreateNavEntry {
  projectId: string;
  navPerToken: string;
  source: "manual" | "formula" | "audited";
  notes?: string;
  updatedBy?: string;
}

export async function createNavEntryWithSupersede(entry: CreateNavEntry) {
  return await db.transaction(async (tx) => {
    await tx
      .update(projectNavHistory)
      .set({ isSuperseded: true })
      .where(
        and(
          eq(projectNavHistory.projectId, entry.projectId),
          eq(projectNavHistory.isSuperseded, false)
        )
      );

    const [newNav] = await tx
      .insert(projectNavHistory)
      .values({
        projectId: entry.projectId,
        navPerToken: entry.navPerToken,
        source: entry.source,
        notes: entry.notes,
        updatedBy: entry.updatedBy,
        isSuperseded: false,
      })
      .returning();

    return newNav;
  });
}

export async function getCurrentNav(projectId: string) {
  const currentNav = await db.query.projectNavHistory.findFirst({
    where: and(
      eq(projectNavHistory.projectId, projectId),
      eq(projectNavHistory.isSuperseded, false)
    ),
    orderBy: (nav, { desc }) => [desc(nav.effectiveAt)],
  });

  return currentNav;
}

export async function getNavHistory(projectId: string) {
  const history = await db.query.projectNavHistory.findMany({
    where: eq(projectNavHistory.projectId, projectId),
    orderBy: (nav, { desc }) => [desc(nav.effectiveAt)],
  });

  return history;
}
