import { parseEnv as nodeParseEnv } from "node:util";

const BYTE_ORDER_MARK = "\uFEFF";

/**
 * Parses the contents of a `.env` file. Assign a key twice and the last
 * assignment wins.
 *
 * Node keeps the byte order mark on the first key, which hides that variable
 * under a name you cannot type, so the mark is stripped before parsing.
 */
export function parseEnv(content: string): Record<string, string> {
  const withoutMark = content.startsWith(BYTE_ORDER_MARK)
    ? content.slice(BYTE_ORDER_MARK.length)
    : content;
  const entries = Object.entries(nodeParseEnv(withoutMark));

  const variables: Record<string, string> = {};
  // Node types every value as possibly missing, which it never is for a key
  // the parser reported
  for (const [key, value] of entries) {
    if (value !== undefined) {
      variables[key] = value;
    }
  }
  return variables;
}
