import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// 使用 prism-light 入口（比全量 prism 轻 ~200KB），仍支持所有语言（按需注册）
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import styles from "./index.module.less";

interface MarkdownContentProps {
  content: string;
}

/**
 * 去除字符串中的公共前导空格（处理模板字符串缩进）
 */
function dedent(text: string): string {
  const lines = text.split("\n");

  // 过滤掉空行，找出最小缩进
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return text;

  const minIndent = Math.min(
    ...nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    }),
  );

  // 移除公共缩进
  return lines
    .map((line) => (line.length >= minIndent ? line.slice(minIndent) : line))
    .join("\n")
    .trim();
}

/**
 * Markdown 渲染组件
 * - 支持 GitHub Flavored Markdown (表格、删除线等)
 * - 代码块语法高亮
 * - 自动处理模板字符串缩进
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  // 去除公共缩进
  const processedContent = useMemo(() => dedent(content), [content]);
  // 自定义渲染组件配置
  const components: Components = useMemo(
    () => ({
      // 代码块渲染
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");

        // 判断是否为代码块（有语言标识）
        if (match) {
          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 8,
                fontSize: "0.875rem",
              }}
            >
              {codeString}
            </SyntaxHighlighter>
          );
        }

        // 行内代码
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    [],
  );

  // 使用 useMemo 缓存渲染结果，避免重复解析
  const renderedContent = useMemo(
    () => (
      <div className={styles.markdownContent}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {processedContent}
        </ReactMarkdown>
      </div>
    ),
    [processedContent, components],
  );

  return renderedContent;
}
