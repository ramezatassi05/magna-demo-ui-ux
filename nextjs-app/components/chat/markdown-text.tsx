'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownTextProps {
  content: string;
}

// Constrained to a safe subset — no raw HTML, no headings, no images.
const ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'code',
  'ul',
  'ol',
  'li',
  'br',
  'a',
];

/**
 * Renders agent-generated text with a constrained Markdown subset. Dark
 * theme styling matches assistant message bubbles.
 */
export function MarkdownText({ content }: MarkdownTextProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={ALLOWED_ELEMENTS}
      unwrapDisallowed
      components={{
        p: ({ children }) => (
          <p className="mb-1.5 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-ink-on-dark">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children }) => (
          <code className="rounded bg-surface-dark/60 px-1 py-0.5 font-mono text-[11px] text-ink-on-dark">
            {children}
          </code>
        ),
        ul: ({ children }) => (
          <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li className="text-[13px]">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-status-info underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
