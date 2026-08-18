import { parseEnv as nodeParseEnv } from "node:util";

const BYTE_ORDER_MARK = "\uFEFF";

/**
 * Parses the contents of a `.env` file. When a key is assigned twice, the last
 * assignment wins.
 *
 * Node's parser keeps a byte order mark on the first key, which leaves that
 * variable unreachable under the name you wrote, so envista removes it first.
 */
export function parseEnv(content: string): Record<string, string> {
  const withoutMark = content.startsWith(BYTE_ORDER_MARK)
    ? content.slice(BYTE_ORDER_MARK.length)
    : content;
  const entries = Object.entries(nodeParseEnv(withoutMark));

  const variables: Record<string, string> = {};
  // Node types a value as possibly missing, which it never is for a key the
  // parser reported
  for (const [key, value] of entries) {
    if (value !== undefined) {
      variables[key] = value;
    }
  }
  return variables;
}
