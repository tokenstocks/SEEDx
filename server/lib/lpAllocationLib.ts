/**
 * LP Allocation Library (Phase 3.2)
 * Functions for managing LP token pricing and capital allocation
 */

import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Recalculate LP token price after NAV change
 * Formula: LP Token Price = NAV / LP Tokens Outstanding
 * 
 * IMPORTANT: This function must be called within an active transaction
 * 
 * @param tx - Active Drizzle transaction client
 * @param projectId - Project ID
 * @returns New LP token price (string with 7 decimals)
 * @throws Error if calculation or update fails
 */
export async function recalculateLPTokenPrice(
  tx: any,
  projectId: string
): Promise<string> {
  // Get project details within transaction
  const [project] = await tx
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  const nav = parseFloat(project.nav || "0");
  const lpTokensOutstanding = parseFloat(project.lpTokensOutstanding || "0");

  console.log(`[LP] Project ${projectId}: Recalculating LP token price`);
  console.log(`[LP]   NAV: ${nav.toFixed(7)}`);
  console.log(`[LP]   LP Tokens Outstanding: ${lpTokensOutstanding.toFixed(7)}`);

  // Guard against zero division - use floor price of 1.0
  if (lpTokensOutstanding === 0) {
    console.log(`[LP]   No LP tokens outstanding, setting price to floor (1.0)`);
    const floorPrice = "1.0000000";
    
    // Update DB to ensure canonical price reflects floor
    await tx
      .update(projects)
      .set({
        lpTokenPrice: floorPrice,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.log(`[LP] ✅ LP token price set to floor: ${floorPrice}`);
    return floorPrice;
  }

  // Calculate LP token price: NAV per token
  const lpTokenPrice = (nav / lpTokensOutstanding).toFixed(7);

  console.log(`[LP]   New Price: ${lpTokenPrice} (NAV per token)`);

  // Update project LP token price
  await tx
    .update(projects)
    .set({
      lpTokenPrice,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  console.log(`[LP] ✅ LP token price updated successfully`);

  return lpTokenPrice;
}
