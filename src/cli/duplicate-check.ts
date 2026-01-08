/**
 * Duplicate convoy detection utilities.
 *
 * This module provides functions to detect potential duplicate convoys
 * by extracting and matching Issue IDs from task descriptions.
 */

const ISSUE_ID_PATTERN = /[A-Z]{2,10}-\d+/g;

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
