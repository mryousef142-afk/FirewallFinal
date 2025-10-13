import { Router } from "express";
import type { RuleAction, RuleCondition, RuleEscalation } from "../../../shared/firewall.js";
import { requireTelegramInitData } from "../middleware/telegramInit.js";
import { requirePanelAdmin } from "../middleware/acl.js";
import {
  listFirewallRules,
  findFirewallRuleById,
  upsertFirewallRule,
  deleteFirewallRule,
} from "../../db/firewallRepository.js";
import { invalidateFirewallCache } from "../../../bot/firewall.js";

export function createFirewallRouter(): Router {
  const router = Router();

  router.use(requireTelegramInitData());
  router.use(requirePanelAdmin());

  router.get("/", async (req, res) => {
    const chatId = typeof req.query.chatId === "string" ? req.query.chatId : undefined;
    const records = await listFirewallRules(chatId);

    res.json({
      chatId: chatId ?? null,
      rules: records.map((record) => ({
        id: record.id,
        scope: record.scope,
        name: record.name,
        description: record.description,
        enabled: record.enabled,
        priority: record.priority,
        matchAll: record.matchAllConditions,
        severity: record.severity,
        groupId: record.groupId,
        createdBy: record.createdBy,
        updatedAt: record.updatedAt.toISOString(),
        config: record.config,
      })),
    });
  });

  router.get("/:id", async (req, res) => {
    const rule = await findFirewallRuleById(req.params.id);
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    res.json({
      id: rule.id,
      scope: rule.scope,
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      priority: rule.priority,
      matchAll: rule.matchAllConditions,
      severity: rule.severity,
      chatId: rule.chatId,
      createdBy: rule.createdBy,
      updatedAt: rule.updatedAt.toISOString(),
      config: rule.config,
    });
  });

  router.post("/", async (req, res) => {
    let payload;
    try {
      payload = parseRulePayload(req.body, req.telegramAuth?.userId ?? null);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid rule payload" });
      return;
    }

    const result = await upsertFirewallRule(payload);
    invalidateFirewallCache(payload.groupChatId ?? null);

    const stored = await findFirewallRuleById(result.id);
    res.status(payload.id ? 200 : 201).json({
      id: result.id,
      chatId: result.chatId,
      scope: result.scope,
      rule: stored
        ? {
            id: stored.id,
            scope: stored.scope,
            updatedAt: stored.updatedAt.toISOString(),
            config: stored.config,
          }
        : null,
    });
  });

  router.delete("/:id", async (req, res) => {
    const rule = await findFirewallRuleById(req.params.id);
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    await deleteFirewallRule(req.params.id);
    invalidateFirewallCache(rule.chatId ?? null);
    res.status(204).send();
  });

  return router;
}

type RawRulePayload = {
  id?: unknown;
  chatId?: unknown;
  scope?: unknown;
  name?: unknown;
  description?: unknown;
  enabled?: unknown;
  priority?: unknown;
  matchAll?: unknown;
  severity?: unknown;
  conditions?: unknown;
  actions?: unknown;
  escalation?: unknown;
};

function parseRulePayload(body: unknown, actorId: string | null) {
  if (!body || typeof body !== "object") {
    throw new Error("Rule payload must be an object");
  }

  const raw = body as RawRulePayload;

  const scope = raw.scope === "global" ? "global" : "group";
  const name = typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name.trim() : null;
  if (!name) {
    throw new Error("Rule name is required");
  }

  const groupChatId =
    scope === "group"
      ? typeof raw.chatId === "string" && raw.chatId.trim().length > 0
        ? raw.chatId.trim()
        : null
      : null;

  if (scope === "group" && !groupChatId) {
    throw new Error("groupChatId is required for group-scoped rules");
  }

  const conditions = normalizeConditions(raw.conditions);
  const actions = normalizeActions(raw.actions);
  const escalation = normalizeEscalation(raw.escalation);

  if (!actions.length) {
    throw new Error("Rule must include at least one action");
  }

  return {
    id: typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : undefined,
    groupChatId,
    scope,
    name,
    description: typeof raw.description === "string" ? raw.description : undefined,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    priority:
      typeof raw.priority === "number" && Number.isFinite(raw.priority) ? Math.trunc(raw.priority) : 100,
    matchAll: typeof raw.matchAll === "boolean" ? raw.matchAll : false,
    severity:
      typeof raw.severity === "number" && Number.isFinite(raw.severity) ? Math.max(1, Math.trunc(raw.severity)) : 1,
    conditions,
    actions,
    escalation,
    createdBy: actorId,
  };
}

function normalizeConditions(value: unknown): RuleCondition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is RuleCondition => {
    if (!item || typeof item !== "object") {
      return false;
    }
    return typeof (item as Record<string, unknown>).kind === "string";
  });
}

function normalizeActions(value: unknown): RuleAction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is RuleAction => {
    if (!item || typeof item !== "object") {
      return false;
    }
    return typeof (item as Record<string, unknown>).kind === "string";
  });
}

function normalizeEscalation(value: unknown): RuleEscalation | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const escalation = value as RuleEscalation;
  if (!escalation.steps || !Array.isArray(escalation.steps) || escalation.steps.length === 0) {
    return undefined;
  }
  const steps = escalation.steps
    .filter(
      (step) =>
        step &&
        typeof step === "object" &&
        typeof step.threshold === "number" &&
        step.threshold > 0 &&
        typeof step.windowSeconds === "number" &&
        step.windowSeconds > 0,
    )
    .map((step) => ({
      threshold: Math.trunc(step.threshold),
      windowSeconds: Math.trunc(step.windowSeconds),
      actions: normalizeActions(step.actions),
    }))
    .filter((step) => step.actions.length > 0);

  if (!steps.length) {
    return undefined;
  }

  return {
    steps,
    resetAfterSeconds:
      typeof escalation.resetAfterSeconds === "number" && escalation.resetAfterSeconds > 0
        ? Math.trunc(escalation.resetAfterSeconds)
        : undefined,
  };
}
