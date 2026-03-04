/**
 * 第三方库类型补充声明
 *
 * 当依赖包的子路径导入没有对应的 @types 声明时，在此文件统一补充。
 *
 * 注意：此文件顶层不能有任何 import/export 语句，否则 TypeScript 会将其
 * 识别为「模块文件」而非「环境声明文件」，导致 declare module 不生效。
 * 需要引用外部类型时，应在每个 declare module 块内部使用 import()。
 */

// ── react-syntax-highlighter ──────────────────────────────────────────────────

/**
 * prism-light：轻量版 Prism 高亮组件入口（比全量 prism 轻 ~200KB）
 * 支持通过 SyntaxHighlighter.registerLanguage() 按需注册语言。
 */
declare module "react-syntax-highlighter/dist/esm/prism-light" {
  import * as React from "react";
  import type { SyntaxHighlighterProps } from "react-syntax-highlighter";
  export default class SyntaxHighlighter extends React.Component<SyntaxHighlighterProps> {
    static registerLanguage(name: string, func: unknown): void;
    static alias(name: string, alias: string | string[]): void;
    static alias(aliases: Record<string, string | string[]>): void;
  }
}

/**
 * styles/prism：Prism 主题样式对象集合（oneDark、dracula 等）
 */
declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import * as React from "react";
  type PrismStyle = Record<string, React.CSSProperties>;
  export const oneDark: PrismStyle;
  export const dracula: PrismStyle;
  export const vscDarkPlus: PrismStyle;
  export const tomorrow: PrismStyle;
  export const atomDark: PrismStyle;
  export const nord: PrismStyle;
  const styles: PrismStyle;
  export default styles;
}
