import { Router } from "express";
import { db } from "@workspace/db";
import { operatorsTable, guestSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import CryptoJS from "crypto-js";

const router = Router();

function hashPassword(password: string): string {
  return CryptoJS.SHA256(password + "voiceforward_salt").toString();
}

function generateToken(): string {
  return CryptoJS.SHA256(randomUUID() + Date.now()).toString();
}

router.post("/auth/guest", async (req, res) => {
  const { name, language = "en" } = req.body;
  if (!name) {
    return res.status(400).json({ error: "bad_request", message: "name is required" });
  }

  const sessionId = randomUUID();
  const callerId = randomUUID();
  const token = generateToken();

  await db.insert(guestSessionsTable).values({
    sessionId,
    callerId,
    name,
    language,
    token,
  });

  return res.status(201).json({ sessionId, callerId, name, language, token });
});

router.post("/auth/operator/register", async (req, res) => {
  const { name, email, password, organization, languages } = req.body;

  if (!name || !email || !password || !organization || !languages) {
    return res.status(400).json({ error: "bad_request", message: "All fields are required" });
  }

  const existing = await db.select().from(operatorsTable).where(eq(operatorsTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "conflict", message: "Email already registered" });
  }

  const id = randomUUID();
  const passwordHash = hashPassword(password);
  const token = generateToken();

  await db.insert(operatorsTable).values({
    id,
    name,
    email,
    passwordHash,
    organization,
    languages,
    status: "available",
  });

  return res.status(201).json({
    operatorId: id,
    name,
    email,
    organization,
    languages,
    token,
    status: "available",
  });
});

router.post("/auth/operator/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "bad_request", message: "email and password required" });
  }

  const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.email, email)).limit(1);
  if (!operator) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
  }

  const hash = hashPassword(password);
  if (hash !== operator.passwordHash) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
  }

  const token = generateToken();

  return res.json({
    operatorId: operator.id,
    name: operator.name,
    email: operator.email,
    organization: operator.organization,
    languages: operator.languages,
    token,
    status: operator.status,
  });
});

export default router;
