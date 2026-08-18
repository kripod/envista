import { expect, test } from "vitest";
import { parseEnv } from "./parse.ts";

/**
 * One case of parsing behavior. `expected` holds every variable the input
 * declares, and every source but `dotenv` owes a `divergence` saying why we
 * read the case differently. A surprise nobody wrote down reads as a bug later.
 */
type ConformanceCase = {
  name: string;
  input: string;
  expected: Record<string, string>;
} & (
  | { source: "dotenv"; divergence?: never }
  | { source: "node" | "php-xdg" | "envista"; divergence: string }
);

/**
 * The whole format, written down once. No two cases walk the same path.
 *
 * `source` is who is being quoted:
 *
 * - `dotenv` is the format every implementation agrees on
 * - `node` is what `util.parseEnv` does where the ecosystem disagrees
 * - `php-xdg` is the POSIX-shell spec at
 *   https://github.com/php-xdg/dotenv-spec, which nobody mainstream follows
 * - `envista` is the little we normalize on top of Node
 */
const conformanceCases: ConformanceCase[] = [
  {
    name: "bare value",
    source: "dotenv",
    input: "A=hello",
    expected: { A: "hello" },
  },
  {
    name: "double quoted value",
    source: "dotenv",
    input: 'A="hello"',
    expected: { A: "hello" },
  },
  {
    name: "single quoted value",
    source: "dotenv",
    input: "A='hello'",
    expected: { A: "hello" },
  },
  {
    name: "backtick quoted value",
    source: "dotenv",
    input: "A=`hello`",
    expected: { A: "hello" },
  },
  {
    name: "export prefix is ignored",
    source: "dotenv",
    input: "export A=hello",
    expected: { A: "hello" },
  },
  {
    name: "whitespace around the equals sign is dropped",
    source: "dotenv",
    input: "A = hello",
    expected: { A: "hello" },
  },
  {
    name: "quotes keep padding that a bare value loses",
    source: "dotenv",
    input: 'A="  x  "',
    expected: { A: "  x  " },
  },
  { name: "empty value", source: "dotenv", input: "A=", expected: { A: "" } },
  {
    name: "a comment ends an unquoted value",
    source: "dotenv",
    input: "A=hello # trailing",
    expected: { A: "hello" },
  },
  {
    name: "a hash inside quotes belongs to the value",
    source: "dotenv",
    input: 'A="a # b"',
    expected: { A: "a # b" },
  },
  {
    name: "a whole-line comment is skipped",
    source: "dotenv",
    input: "# note\nA=hello",
    expected: { A: "hello" },
  },
  {
    name: "a line without an equals sign declares nothing",
    source: "dotenv",
    input: "JUSTAKEY",
    expected: {},
  },
  {
    name: "only the first equals sign separates",
    source: "dotenv",
    input: "A=b=c",
    expected: { A: "b=c" },
  },
  {
    name: "the last assignment to a key wins",
    source: "dotenv",
    input: "A=first\nA=second",
    expected: { A: "second" },
  },
  {
    name: "double quotes span lines",
    source: "dotenv",
    input: 'A="one\ntwo"',
    expected: { A: "one\ntwo" },
  },
  {
    name: "backslash-n expands inside double quotes",
    source: "dotenv",
    input: String.raw`A="one\ntwo"`,
    expected: { A: "one\ntwo" },
  },
  {
    name: "backslash-n stays literal inside single quotes",
    source: "dotenv",
    input: String.raw`A='one\ntwo'`,
    expected: { A: String.raw`one\ntwo` },
  },
  {
    name: "carriage returns do not reach the value",
    source: "dotenv",
    input: "A=hello\r\nB=world\r\n",
    expected: { A: "hello", B: "world" },
  },
  {
    name: "backslashes in a Windows path survive",
    source: "dotenv",
    input: String.raw`A=C:\Users\foo`,
    expected: { A: String.raw`C:\Users\foo` },
  },
  {
    name: "non-ASCII values survive",
    source: "dotenv",
    input: "A=héllo→✓",
    expected: { A: "héllo→✓" },
  },
  {
    name: "references are left for the caller to expand",
    source: "dotenv",
    input: "A=one\nB=${A}two",
    expected: { A: "one", B: "${A}two" },
  },
  {
    name: "backslash-r stays literal inside double quotes",
    source: "node",
    input: String.raw`A="a\rb"`,
    expected: { A: String.raw`a\rb` },
    divergence: "dotenv expands this one into a carriage return.",
  },
  {
    name: "an escaped double quote ends the value",
    source: "node",
    input: String.raw`A="he\"llo"`,
    expected: { A: "he\\" },
    divergence:
      "Node drops the rest of the line. Single quote the value to keep the quote.",
  },
  {
    name: "a __proto__ assignment declares nothing",
    source: "node",
    input: "A=hello\n__proto__=polluted",
    expected: { A: "hello" },
    divergence: "Node drops the key, so a file cannot reach Object.prototype.",
  },
  {
    name: "a hash without leading space still starts a comment",
    source: "php-xdg",
    input: "A=he#llo",
    expected: { A: "he" },
    divergence:
      "POSIX keeps `he#llo`, since a hash only opens a comment at the start of a word.",
  },
  {
    name: "a line holds one assignment",
    source: "php-xdg",
    input: "A=one B=two",
    expected: { A: "one B=two" },
    divergence: "POSIX reads this as two assignments.",
  },
  {
    name: "an unterminated quote is kept verbatim",
    source: "php-xdg",
    input: 'A="oops',
    expected: { A: '"oops' },
    divergence: "POSIX raises a parse error instead.",
  },
  {
    name: "adjacent quoted runs do not concatenate",
    source: "php-xdg",
    input: `A='foo'bar"baz"`,
    expected: { A: "foo" },
    divergence: "POSIX joins the runs into `foobarbaz`.",
  },
  {
    name: "a trailing backslash does not continue the line",
    source: "php-xdg",
    input: "A=foo\\\nbar",
    expected: { A: "foo\\" },
    divergence: "POSIX joins the two lines into `foobar`.",
  },
  {
    name: "a backslash does not escape a space",
    source: "php-xdg",
    input: String.raw`A=b\ c`,
    expected: { A: String.raw`b\ c` },
    divergence: "POSIX reads the escape and gives you `b c`.",
  },
  {
    name: "a byte order mark stays out of the first key",
    source: "envista",
    input: "\uFEFFA=hello",
    expected: { A: "hello" },
    divergence:
      "Node keeps the mark, which leaves the variable unreachable under the name written in the file.",
  },
];

test.for(conformanceCases)("$source: $name", ({ input, expected }) => {
  expect(parseEnv(input)).toEqual(expected);
});
