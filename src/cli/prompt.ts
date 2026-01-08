/**
 * Interactive prompt utilities for convoy selection.
 *
 * This module provides functions to display convoy lists and
 * handle user input for selecting between existing convoys,
 * creating new ones, or canceling operations.
 */

import type { ConvoyMatch } from './duplicate-check.ts';

export type SelectionAction = 'resume' | 'create' | 'cancel';

export type Selection =
  | { action: 'resume'; convoyId: string }
  | { action: 'create' }
  | { action: 'cancel' };

/**
 * Formats a list of convoy matches for display to the user.
 *
 * @param matches - Array of ConvoyMatch objects to display
 * @returns Formatted string with numbered options
 */
export function formatConvoyList(matches: ConvoyMatch[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('⚠️  找到相同 Issue ID 的 convoy:');
  lines.push('');

  matches.forEach((match, index) => {
    const runningStatus = match.isRunning ? '(running)' : '(stopped)';
    const truncatedTitle = match.title.length > 50
      ? match.title.slice(0, 47) + '...'
      : match.title;
    lines.push(`  ${index + 1}. ${match.id} [${match.status}] ${runningStatus} - ${truncatedTitle}`);
  });

  lines.push(`  ${matches.length + 1}. 創建新的 convoy`);
  lines.push(`  ${matches.length + 2}. 取消`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Parses user input to determine the selection.
 *
 * @param input - User input string
 * @param matchCount - Number of convoy matches available
 * @returns Selection object or null if input is invalid
 */
export function parseSelection(input: string, matchCount: number): Selection | null {
  const num = parseInt(input.trim(), 10);

  if (isNaN(num) || num < 1 || num > matchCount + 2) {
    return null;
  }

  if (num <= matchCount) {
    return { action: 'resume', convoyId: '' }; // convoyId filled by caller
  } else if (num === matchCount + 1) {
    return { action: 'create' };
  } else {
    return { action: 'cancel' };
  }
}

/**
 * Prompts the user to select from a list of convoy matches.
 *
 * In non-TTY mode, prints an error message with resume instructions
 * and returns cancel action.
 *
 * @param matches - Array of ConvoyMatch objects to choose from
 * @returns Promise resolving to the user's Selection
 */
export async function promptConvoySelection(matches: ConvoyMatch[]): Promise<Selection> {
  // Check if running in TTY
  if (!Deno.stdin.isTerminal()) {
    console.error('Error: Duplicate convoys found but running in non-interactive mode.');
    console.error('Use --resume <convoy-id> to resume an existing convoy:');
    matches.forEach((m) => console.error(`  gastown --resume ${m.id}`));
    return { action: 'cancel' };
  }

  console.log('🔍 檢查現有 convoys...');
  console.log(formatConvoyList(matches));

  const prompt = `請選擇 [1-${matches.length + 2}]: `;

  while (true) {
    await Deno.stdout.write(new TextEncoder().encode(prompt));

    const buf = new Uint8Array(64);
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      return { action: 'cancel' };
    }

    const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
    const selection = parseSelection(input, matches.length);

    if (selection === null) {
      console.log('無效選擇，請重新輸入。');
      continue;
    }

    if (selection.action === 'resume') {
      const index = parseInt(input, 10) - 1;
      return { action: 'resume', convoyId: matches[index].id };
    }

    return selection;
  }
}
