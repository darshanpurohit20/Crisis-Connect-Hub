import { Router } from "express";
import { db } from "@workspace/db";
import { operatorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatOperator(op: any) {
  return {
    id: op.id,
    name: op.name,
    email: op.email,
    organization: op.organization,
    languages: op.languages,
    status: op.status,
    activeCallId: op.activeCallId ?? null,
    callsHandled: op.callsHandled,
    avgCallDuration: op.avgCallDuration,
    createdAt: op.createdAt.toISOString(),
  };
}

router.get("/operators", async (req, res) => {
  const operators = await db.select().from(operatorsTable);
  return res.json(operators.map(formatOperator));
});

router.get("/operators/:operatorId", async (req, res) => {
  const { operatorId } = req.params;
  const [op] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, operatorId)).limit(1);
  if (!op) return res.status(404).json({ error: "not_found", message: "Operator not found" });
  return res.json(formatOperator(op));
});

router.patch("/operators/:operatorId/status", async (req, res) => {
  const { operatorId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "bad_request", message: "status required" });
  }

  const [updated] = await db.update(operatorsTable).set({ status }).where(eq(operatorsTable.id, operatorId)).returning();
  if (!updated) return res.status(404).json({ error: "not_found", message: "Operator not found" });
  return res.json(formatOperator(updated));
});

export default router;
