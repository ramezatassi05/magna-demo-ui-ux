interface UserMessageBubbleProps {
  content: string;
}

/** Right-aligned user message bubble — blue-tinted on dark surface. */
export function UserMessageBubble({ content }: UserMessageBubbleProps) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-status-info/15 px-3 py-2 text-[13px] leading-relaxed text-ink-on-dark">
        {content}
      </div>
    </div>
  );
}
