'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownProps {
  content: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all duration-150 hover:opacity-80"
      style={{
        color: copied ? 'var(--status-active)' : 'var(--text-tertiary)',
      }}
      aria-label={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function MarkdownRenderer({ content }: MarkdownProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          // Code blocks with syntax highlighting
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match?.[1] ?? '';
            const codeText = String(children).replace(/\n$/, '');
            const isBlock = node?.position?.start?.line !== node?.position?.end?.line ||
              codeText.includes('\n');

            if (isBlock || match) {
              return (
                <div className="relative my-3 rounded-lg overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid var(--border)' }}>
                  {/* Code header */}
                  <div
                    className="flex items-center justify-between px-3 py-1.5"
                    style={{ borderBottom: '1px solid var(--border)', background: '#111111' }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {language || 'code'}
                    </span>
                    <CopyButton text={codeText} />
                  </div>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={language || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: '12px 16px',
                      background: 'transparent',
                      fontSize: '0.8125rem',
                      lineHeight: '1.6',
                    }}
                  >
                    {codeText}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 rounded text-xs font-mono"
                style={{
                  background: 'var(--surface-raised)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold mt-5 mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-4 mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-2" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="mb-3 pl-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 pl-4 space-y-1 list-decimal" style={{ color: 'var(--text-secondary)' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', listStyleType: 'disc' }}>
              {children}
            </li>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote
              className="pl-3 my-3 italic"
              style={{
                borderLeft: '2px solid var(--accent)',
                color: 'var(--text-tertiary)',
              }}
            >
              {children}
            </blockquote>
          ),

          // Strong / em
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{ color: 'var(--text-secondary)' }}>{children}</em>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-4" style={{ borderColor: 'var(--border)' }} />
          ),

          // Table
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table
                className="w-full text-sm border-collapse"
                style={{ borderColor: 'var(--border)' }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className="px-3 py-2 text-left text-xs font-semibold"
              style={{
                background: 'var(--surface-raised)',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="px-3 py-2 text-xs"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
