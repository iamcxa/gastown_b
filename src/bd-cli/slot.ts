// src/bd-cli/slot.ts
import { execBd, execBdJson } from './executor.ts';

export type SlotName = 'hook' | 'role';

interface BdSlotShowResult {
  slots: Record<string, string | null>;
}

export async function setSlot(
  agentId: string,
  slotName: SlotName,
  value: string
): Promise<void> {
  await execBd(['slot', 'set', agentId, slotName, value]);
}

export async function getSlot(
  agentId: string,
  slotName: SlotName
): Promise<string | null> {
  const result = await execBdJson<BdSlotShowResult>(['slot', 'show', agentId]);
  return result.slots?.[slotName] ?? null;
}

export async function clearSlot(
  agentId: string,
  slotName: SlotName
): Promise<void> {
  await execBd(['slot', 'clear', agentId, slotName]);
}

export async function getAllSlots(agentId: string): Promise<Record<SlotName, string | null>> {
  const result = await execBdJson<BdSlotShowResult>(['slot', 'show', agentId]);
  return {
    hook: result.slots?.hook ?? null,
    role: result.slots?.role ?? null,
  };
}
