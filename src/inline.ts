/**
 * Lightweight inline-emphasis parser shared by all templates.
 *
 * Config body strings may contain Markdown-style `**bold**` markers to mark the
 * design's navy "key phrase" emphasis. This keeps configs clean and template-
 * agnostic: HTML templates turn segments into <b>.
 */

export interface InlineSegment {
  text: string;
  bold: boolean;
}

const BOLD_RE = /\*\*(.+?)\*\*/g;

/** Split a string into plain / bold segments on `**...**`. */
export function parseInline(rawInput: string): InlineSegment[] {
  const input = String(rawInput);
  const segments: InlineSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BOLD_RE.lastIndex = 0;
  while ((m = BOLD_RE.exec(input)) !== null) {
    if (m.index > last) {
      segments.push({ text: input.slice(last, m.index), bold: false });
    }
    segments.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    segments.push({ text: input.slice(last), bold: false });
  }
  return segments;
}

/** Escape a plain string for safe HTML output. Coerces non-strings (e.g. YAML numbers). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a config string with `**bold**` markers into HTML, wrapping bold
 * segments in <b> with the given CSS color variable.
 */
export function inlineToHtml(
  input: string,
  boldColorVar = "var(--navy)",
): string {
  return parseInline(input)
    .map((seg) =>
      seg.bold
        ? `<b style="color:${boldColorVar}; font-weight:700;">${escapeHtml(seg.text)}</b>`
        : escapeHtml(seg.text),
    )
    .join("");
}
