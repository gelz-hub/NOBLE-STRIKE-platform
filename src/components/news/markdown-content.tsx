import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function videoEmbedUrl(href: string): string | null {
  const yt = href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = href.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const twitch = href.match(/twitch\.tv\/videos\/(\d+)/);
  if (twitch) return `https://player.twitch.tv/?video=${twitch[1]}&parent=${process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : "localhost"}`;
  return null;
}

/**
 * Renders admin-authored Markdown as content. Only admins can ever write
 * this (see SECURITY.md) so raw HTML isn't parsed at all — react-markdown
 * treats it as plain text by default, which is the safe choice even for a
 * trusted-author CMS. Video embeds work by convention: any link to
 * YouTube/Vimeo/Twitch renders as a responsive iframe instead of a plain link.
 */
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-ns">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const embedUrl = href ? videoEmbedUrl(href) : null;
            if (embedUrl) {
              return (
                <span className="block relative w-full aspect-video rounded-lg overflow-hidden border border-gold/20 my-4">
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </span>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light underline underline-offset-2">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) =>
            typeof src === "string" ? (
              <span className="block relative w-full my-4 rounded-lg overflow-hidden border border-gold/15" style={{ aspectRatio: "16/9" }}>
                <Image src={src} alt={alt ?? ""} fill sizes="700px" className="object-cover" />
              </span>
            ) : null,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(213,190,119,0.15)", borderRadius: "0.5rem" }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-black/40 border border-gold/15 rounded px-1.5 py-0.5 text-gold-light text-sm" {...props}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gold/50 pl-4 italic text-white/70 my-4">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gold/20 bg-gold/5 px-3 py-2 text-left text-gold-light">{children}</th>
          ),
          td: ({ children }) => <td className="border border-gold/10 px-3 py-2 text-white/80">{children}</td>,
          h1: ({ children }) => <h1 className="font-display font-bold text-2xl text-white mt-8 mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="font-display font-bold text-xl text-white mt-6 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="font-heading font-bold text-lg text-gold-light mt-5 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-white/80 leading-relaxed mb-4">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside text-white/80 space-y-1 mb-4 ml-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-white/80 space-y-1 mb-4 ml-2">{children}</ol>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
