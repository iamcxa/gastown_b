/**
 * Duplicate convoy detection utilities.
 *
 * This module provides functions to detect potential duplicate convoys
 * by extracting and matching Issue IDs from task descriptions.
 */

import { listConvoys } from '../bd-cli/convoy.ts';
import { sessionExists } from '../tmux/operations.ts';

const ISSUE_ID_PATTERN = /[A-Z]{2,10}-\d+/g;

export interface ConvoyMatch {
  id: string;
  title: string;
  status: string;
  isRunning: boolean;
  issueId: string;
}

/**
 * Extracts Issue IDs from a text string.
 *
 * Issue IDs follow the pattern: 2-10 uppercase letters, a hyphen, and one or more digits.
 * Examples: SC-274, REC-123, PROJ-1
 *
 * @param text - The text to search for Issue IDs
 * @returns Array of unique Issue IDs found in the text
 */
export function extractIssueIds(text: string): string[] {
  const matches = text.match(ISSUE_ID_PATTERN);
  if (!matches) return [];
  return [...new Set(matches)];
}

/**
 * Finds existing convoys that match the given issue IDs.
 *
 * Searches open and in_progress convoys for titles containing any of the
 * provided issue IDs. Also checks if tmux sessions are running for matches.
 *
 * @param issueIds - Array of issue IDs to search for
 * @returns Array of ConvoyMatch objects for matching convoys
 */
export async function findDuplicateConvoys(issueIds: string[]): Promise<ConvoyMatch[]> {
  if (issueIds.length === 0) return [];

  try {
    // Fetch open and in_progress convoys
    const [openConvoys, inProgressConvoys] = await Promise.all([
      listConvoys('open'),
      listConvoys('in_progress'),
    ]);

    const allConvoys = [...openConvoys, ...inProgressConvoys];
    const matches: ConvoyMatch[] = [];

    for (const convoy of allConvoys) {
      for (const issueId of issueIds) {
        if (convoy.title.includes(issueId)) {
          const sessionName = `gastown-${convoy.id}`;
          const isRunning = await sessionExists(sessionName);

          matches.push({
            id: convoy.id,
            title: convoy.title,
            status: convoy.status,
            isRunning,
            issueId,
          });
          break; // Avoid duplicate entries for same convoy
        }
      }
    }

    return matches;
  } catch (error) {
    // Graceful degradation: if bd CLI fails, return empty (allow creation)
    console.warn('Warning: Failed to check for duplicate convoys:', error);
    return [];
  }
}
