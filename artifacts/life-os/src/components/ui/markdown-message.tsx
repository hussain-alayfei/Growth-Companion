import { Fragment } from "react";

/**
 * Lightweight Arabic-first markdown renderer for AI coach messages.
 * Supports: headings (#, ##), bold (**text**), bullet lists (- / •),
 * numbered lists (1.), and paragraphs — without pulling a full markdown
 * dependency, since coach output uses a small predictable subset.
 */

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

interface Block {
  type: "h1" | "h2" | "ul" | "ol" | "p";
  items: string[];
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flush = () => {
    if (current && current.items.length > 0) blocks.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flush();
      continue;
    }

    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", items: [line.slice(3)] });
      continue;
    }
    if (line.startsWith("# ")) {
      flush();
      blocks.push({ type: "h1", items: [line.slice(2)] });
      continue;
    }

    const bulletMatch = /^[-•*]\s+(.*)/.exec(line);
    if (bulletMatch) {
      if (current?.type !== "ul") {
        flush();
        current = { type: "ul", items: [] };
      }
      current.items.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = /^\d+[.)]\s+(.*)/.exec(line);
    if (numberedMatch) {
      if (current?.type !== "ol") {
        flush();
        current = { type: "ol", items: [] };
      }
      current.items.push(numberedMatch[1]);
      continue;
    }

    if (current?.type !== "p") {
      flush();
      current = { type: "p", items: [] };
    }
    current.items.push(line);
  }
  flush();

  return blocks;
}

export function MarkdownMessage({ content, className = "" }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className={`text-sm leading-relaxed space-y-2 ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === "h1") {
          return (
            <h3 key={i} className="text-base font-bold text-foreground mt-1">
              {renderInline(block.items[0])}
            </h3>
          );
        }
        if (block.type === "h2") {
          return (
            <h4 key={i} className="text-sm font-bold text-primary mt-1">
              {renderInline(block.items[0])}
            </h4>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc mr-4 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal mr-4 space-y-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline(block.items.join(" "))}</p>;
      })}
    </div>
  );
}
