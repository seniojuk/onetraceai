import { useState, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MarkdownProps {
  children: string;
  className?: string;
}

function CodeBlock({ children, ...props }: ComponentProps<"pre">) {
  const [copied, setCopied] = useState(false);

  const extractText = (node: React.ReactNode): string => {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node && typeof node === "object" && "props" in node) {
      return extractText((node as { props: { children?: React.ReactNode } }).props.children);
    }
    return "";
  };

  const text = extractText(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group not-prose my-4">
      <pre
        {...props}
        className="bg-muted rounded-md p-4 overflow-x-auto text-sm font-mono border border-border"
      >
        {children}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 mr-1 text-green-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground",
        "prose-code:text-foreground prose-pre:bg-muted prose-a:text-primary",
        "prose-li:text-foreground/90 prose-table:text-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          pre: (props) => <CodeBlock {...(props as ComponentProps<"pre">)} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;
