import { Router } from "express";
import { db } from "@workspace/db";
import { callsTable, operatorsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

function formatCall(call: any) {
  return {
    id: call.id,
    callerId: call.callerId,
    callerName: call.callerName,
    operatorId: call.operatorId ?? null,
    operatorName: call.operatorName ?? null,
    state: call.state,
    language: call.language,
    riskLevel: call.riskLevel ?? null,
    riskScore: call.riskScore ?? null,
    duration: call.duration ?? null,
    startedAt: call.startedAt ? call.startedAt.toISOString() : null,
    endedAt: call.endedAt ? call.endedAt.toISOString() : null,
    createdAt: call.createdAt.toISOString(),
    location: call.location ?? null,
    aiDisclosed: call.aiDisclosed,
  };
}

router.get("/queue", async (req, res) => {
  const activeCalls = await db.select().from(callsTable)
    .where(inArray(callsTable.state, ["waiting", "caller_connected", "active", "on_hold", "dispatching"]));

  const waitingCount = activeCalls.filter(c => c.state === "waiting" || c.state === "caller_connected").length;
  const activeCount = activeCalls.filter(c => c.state === "active" || c.state === "dispatching").length;
  const onHoldCount = activeCalls.filter(c => c.state === "on_hold").length;

  const availableOps = await db.select().from(operatorsTable).where(eq(operatorsTable.status, "available"));

  return res.json({
    waitingCount,
    activeCount,
    onHoldCount,
    availableOperators: availableOps.length,
    calls: activeCalls.map(formatCall),
  });
});

export default router;
