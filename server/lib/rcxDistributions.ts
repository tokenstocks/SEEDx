import Decimal from "decimal.js";
import { db } from "../db";
import {
  projects,
  projectCashflows,
  investments,
  regeneratorCashflowDistributions,
  lpPoolTransactions,
  treasuryPoolTransactions,
} from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export interface RCXDistributionCalculation {
  cashflowId: string;
  projectId: string;
  totalAmount: Decimal;
  lpReplenishment: Decimal;
  regeneratorDistribution: Decimal;
  treasury: Decimal;
  projectRetained: Decimal;
  regeneratorAllocations: {
    userId: string;
    tokensHeld: Decimal;
    shareAmount: Decimal;
    sharePercentage: Decimal;
  }[];
}

export async function calculateRCXDistribution(
  cashflowId: string
): Promise<RCXDistributionCalculation> {
  const cashflow = await db
    .select()
    .from(projectCashflows)
    .where(eq(projectCashflows.id, cashflowId))
    .limit(1);

  if (cashflow.length === 0) {
    throw new Error("Cashflow not found");
  }

  if (cashflow[0].processed) {
    throw new Error("Cashflow already distributed");
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, cashflow[0].projectId))
    .limit(1);

  if (project.length === 0) {
    throw new Error("Project not found");
  }

  const totalAmount = new Decimal(cashflow[0].amountNgnts);

  const lpPercent = new Decimal(project[0].lpReplenishmentPercent || "0");
  const regeneratorPercent = new Decimal(project[0].regeneratorDistributionPercent || "0");
  const treasuryPercent = new Decimal(project[0].treasuryPercent || "0");
  const projectPercent = new Decimal(project[0].projectRetainedPercent || "0");

  const percentSum = lpPercent.plus(regeneratorPercent).plus(treasuryPercent).plus(projectPercent);
  if (!percentSum.equals(100)) {
    throw new Error(`Invalid profit split percentages (sum=${percentSum.toString()}, expected 100)`);
  }

  const totalCents = totalAmount.times(100).toDecimalPlaces(0, Decimal.ROUND_DOWN);

  const lpCents = totalCents.times(lpPercent).dividedBy(100);
  const regeneratorCents = totalCents.times(regeneratorPercent).dividedBy(100);
  const treasuryCents = totalCents.times(treasuryPercent).dividedBy(100);
  const projectCents = totalCents.times(projectPercent).dividedBy(100);

  const allocations = [
    {
      name: "lp" as const,
      floored: lpCents.toDecimalPlaces(0, Decimal.ROUND_DOWN),
      fractional: lpCents.minus(lpCents.toDecimalPlaces(0, Decimal.ROUND_DOWN)),
    },
    {
      name: "regenerator" as const,
      floored: regeneratorCents.toDecimalPlaces(0, Decimal.ROUND_DOWN),
      fractional: regeneratorCents.minus(regeneratorCents.toDecimalPlaces(0, Decimal.ROUND_DOWN)),
    },
    {
      name: "treasury" as const,
      floored: treasuryCents.toDecimalPlaces(0, Decimal.ROUND_DOWN),
      fractional: treasuryCents.minus(treasuryCents.toDecimalPlaces(0, Decimal.ROUND_DOWN)),
    },
    {
      name: "project" as const,
      floored: projectCents.toDecimalPlaces(0, Decimal.ROUND_DOWN),
      fractional: projectCents.minus(projectCents.toDecimalPlaces(0, Decimal.ROUND_DOWN)),
    },
  ];

  const flooredSum = allocations.reduce(
    (sum, a) => sum.plus(a.floored),
    new Decimal(0)
  );
  let leftoverCents = totalCents.minus(flooredSum).toNumber();

  allocations.sort((a, b) => b.fractional.comparedTo(a.fractional));

  for (let i = 0; i < leftoverCents && i < allocations.length; i++) {
    allocations[i].floored = allocations[i].floored.plus(1);
  }

  const lpAmount = allocations.find((a) => a.name === "lp")!.floored.dividedBy(100);
  const regeneratorAmount = allocations.find((a) => a.name === "regenerator")!.floored.dividedBy(100);
  const treasuryAmount = allocations.find((a) => a.name === "treasury")!.floored.dividedBy(100);
  const projectAmount = allocations.find((a) => a.name === "project")!.floored.dividedBy(100);

  const regenerators = await db
    .select({
      userId: investments.userId,
      tokensReceived: investments.tokensReceived,
    })
    .from(investments)
    .where(
      and(
        eq(investments.projectId, cashflow[0].projectId),
        isNotNull(investments.tokensReceived)
      )
    );

  const totalTokens = regenerators.reduce(
    (sum, inv) => sum.plus(new Decimal(inv.tokensReceived)),
    new Decimal(0)
  );

  if (totalTokens.equals(0)) {
    throw new Error("No qualifying Regenerators found (all token holdings are zero)");
  }

  let allocatedTotal = new Decimal(0);
  const regeneratorAllocations = regenerators.map((regenerator, index) => {
    const tokensHeld = new Decimal(regenerator.tokensReceived);
    const sharePercentage = totalTokens.greaterThan(0)
      ? tokensHeld.dividedBy(totalTokens).times(100).toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
      : new Decimal(0);

    let shareAmount: Decimal;
    if (index === regenerators.length - 1) {
      shareAmount = regeneratorAmount.minus(allocatedTotal);
    } else {
      shareAmount = regeneratorAmount
        .times(tokensHeld)
        .dividedBy(totalTokens)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      allocatedTotal = allocatedTotal.plus(shareAmount);
    }

    return {
      userId: regenerator.userId,
      tokensHeld,
      shareAmount,
      sharePercentage,
    };
  });

  return {
    cashflowId,
    projectId: cashflow[0].projectId,
    totalAmount,
    lpReplenishment: lpAmount,
    regeneratorDistribution: regeneratorAmount,
    treasury: treasuryAmount,
    projectRetained: projectAmount,
    regeneratorAllocations,
  };
}

export async function isRCXCashflowAlreadyDistributed(cashflowId: string): Promise<boolean> {
  const cashflow = await db
    .select({ processed: projectCashflows.processed })
    .from(projectCashflows)
    .where(eq(projectCashflows.id, cashflowId))
    .limit(1);

  return cashflow.length > 0 && cashflow[0].processed === true;
}
