export type PaymentTerm = { percentage: string; description: string };

export type ConditionBlock =
  | { type: "paragraph"; text: string }
  | { type: "payments"; rows: PaymentTerm[] };

// Keep the editable text as the source for both the preview/PDF and Word.
export function parseConditions(text: string): ConditionBlock[] {
  const blocks: ConditionBlock[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  }

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const payment = trimmed.match(/^(?:[•●▪\-*]\s*)?(\d+(?:[.,]\d+)?\s*%)\s+(.+)$/);
    if (payment) {
      flushParagraph();
      const row = { percentage: payment[1].replace(/\s/g, ""), description: payment[2] };
      const previous = blocks[blocks.length - 1];
      if (previous?.type === "payments") previous.rows.push(row);
      else blocks.push({ type: "payments", rows: [row] });
    } else {
      paragraph.push(line);
    }
  }

  flushParagraph();
  return blocks;
}
