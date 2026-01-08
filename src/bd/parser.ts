/**
 * @deprecated This parser uses the old custom bd file format.
 * Use bd CLI commands instead via src/bd-cli/mod.ts.
 * This module will be removed in v0.2.0.
 */
import type { BdFile, BdSection, BdTask, RoleName, TaskStatus } from '../types.ts';

// Status emoji constants for reliable matching
const STATUS_EMOJIS = ['🔵', '🟡', '✅', '⚠️'] as const;
const NOTE_EMOJI = '📝';

/**
 * Check if a string starts with a status emoji
 */
function extractStatusEmoji(str: string): TaskStatus | null {
  for (const emoji of STATUS_EMOJIS) {
    if (str.startsWith(emoji)) {
      return emoji;
    }
  }
  return null;
}

/**
 * Parse bd file content into a structured BdFile object.
 * @param content - Raw content of the bd file
 * @param path - File path for reference
 * @returns Parsed BdFile structure
 */
export function parseBdContent(content: string, path: string): BdFile {
  const lines = content.split('\n');

  let convoyName = '';
  let convoyDescription = '';
  const meta: Record<string, string> = {};
  const sections: BdSection[] = [];

  let currentSection: BdSection | null = null;
  let currentTask: BdTask | null = null;
  let inMeta = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse convoy header: # convoy-name.bd
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      const match = trimmed.match(/^# (convoy-[\w-]+)/);
      if (match) {
        convoyName = match[1].replace('.bd', '');
      }
      continue;
    }

    // Parse convoy description: ## 🟡 Convoy: Description (SC-###)
    if (trimmed.startsWith('## ') && trimmed.includes('Convoy:')) {
      const convoyIndex = trimmed.indexOf('Convoy:');
      if (convoyIndex !== -1) {
        convoyDescription = trimmed.slice(convoyIndex + 8).trim();
      }
      continue;
    }

    // Parse section header: ### SectionName
    if (trimmed.startsWith('### ')) {
      const sectionName = trimmed.slice(4).trim();
      if (sectionName === 'Meta') {
        inMeta = true;
        continue;
      }
      inMeta = false;
      currentSection = { name: sectionName, tasks: [] };
      sections.push(currentSection);
      currentTask = null;
      continue;
    }

    // Parse meta notes: 📝 key: value
    if (inMeta && trimmed.startsWith(NOTE_EMOJI)) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        const key = trimmed.slice(NOTE_EMOJI.length + 1, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        meta[key] = value;
      }
      continue;
    }

    // Parse task: 🟡 [Role-N] Description
    const statusEmoji = extractStatusEmoji(trimmed);
    if (statusEmoji && currentSection) {
      // Find the bracket content
      const bracketStart = trimmed.indexOf('[');
      const bracketEnd = trimmed.indexOf(']');
      if (bracketStart !== -1 && bracketEnd !== -1) {
        const bracketContent = trimmed.slice(bracketStart + 1, bracketEnd);
        const description = trimmed.slice(bracketEnd + 1).trim();

        // Parse role and optional instance number
        const roleMatch = bracketContent.match(/^(\w+)(?:-(\d+))?$/);
        if (roleMatch) {
          const [, roleName, instanceStr] = roleMatch;
          const role = roleName.toLowerCase() as RoleName;
          const instance = instanceStr ? parseInt(instanceStr, 10) : undefined;

          currentTask = {
            id: `${role}${instance ? '-' + instance : ''}`,
            role,
            roleInstance: instance,
            description,
            status: statusEmoji,
            notes: [],
          };
          currentSection.tasks.push(currentTask);
        }
      }
      continue;
    }

    // Parse task note: 📝 key: value (indented with 2 spaces)
    if (line.startsWith('  ' + NOTE_EMOJI) && currentTask) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        const key = trimmed.slice(NOTE_EMOJI.length + 1, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        currentTask.notes.push({ key, value });
      }
      continue;
    }
  }

  return {
    path,
    convoyName,
    convoyDescription,
    meta,
    sections,
  };
}

/**
 * Parse a bd file from disk.
 * @param path - Path to the bd file
 * @returns Parsed BdFile structure
 */
export async function parseBdFile(path: string): Promise<BdFile> {
  const content = await Deno.readTextFile(path);
  return parseBdContent(content, path);
}
