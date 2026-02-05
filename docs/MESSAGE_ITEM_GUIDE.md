# MessageItem 组件技术指南

> 本文档定义了 `message-item.tsx` 组件的实现规范，包括消息类型区分、Markdown 渲染、交互行为及样式设计。

## 需求概述

| 消息类型       | 内容渲染            | 交互行为                       |
| -------------- | ------------------- | ------------------------------ |
| `AIMessage`    | Markdown 富文本渲染 | 底部显示"复制"、"重新生成"按钮 |
| `HumanMessage` | 纯文本              | 鼠标悬浮时左侧浮现"复制"按钮   |

---

## 数据结构设计

```typescript
// src/pages/chat/types.ts
export type MessageRole = "human" | "ai";

export interface Message {
  id: string | number;
  role: MessageRole;
  content: string;
  timestamp?: Date;
}
```

---

## 组件 Props 设计

```typescript
interface MessageItemProps {
  message: Message;
  /** 复制成功回调 */
  onCopy?: (content: string) => void;
  /** 重新生成回调（仅 AI 消息） */
  onRegenerate?: (messageId: string | number) => void;
}
```

---

## 实现原理

### 1. Markdown 渲染（AIMessage）

**推荐方案：`react-markdown` + `remark-gfm` + `react-syntax-highlighter`**

| 库                         | 作用                                           |
| -------------------------- | ---------------------------------------------- |
| `react-markdown`           | 将 Markdown 字符串解析为 React 组件            |
| `remark-gfm`               | 支持 GitHub Flavored Markdown (表格、删除线等) |
| `react-syntax-highlighter` | 代码块语法高亮                                 |

**安装依赖：**

```bash
pnpm add react-markdown remark-gfm react-syntax-highlighter
pnpm add -D @types/react-syntax-highlighter
```

**渲染原理：**

1. `react-markdown` 使用 `remark` 将 Markdown 解析为 AST（抽象语法树）
2. 遍历 AST 节点，将每个节点映射为对应的 React 组件
3. 通过 `components` prop 自定义各 Markdown 元素的渲染组件

**核心实现：**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // 自定义代码块渲染
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;

          return isInline ? (
            <code className={className} {...props}>
              {children}
            </code>
          ) : (
            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
        // 自定义其他元素...
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

---

### 2. 悬浮显示操作按钮（HumanMessage）

**实现原理：CSS `:hover` + `opacity` 过渡**

使用父元素的 `:hover` 伪类控制子元素的显示/隐藏，结合 `opacity` 和 `transition` 实现平滑过渡效果。

**关键点：**

1. 操作按钮默认 `opacity: 0`
2. 父容器 `:hover` 时设置按钮 `opacity: 1`
3. 使用 `transition` 实现淡入淡出效果
4. 按钮使用 `position: absolute` 定位在消息左侧

**实现示例：**

```tsx
<Box
  sx={{
    position: "relative",
    "&:hover .message-actions": {
      opacity: 1,
    },
  }}
>
  {/* 操作按钮 - 左侧定位 */}
  <Box
    className="message-actions"
    sx={{
      position: "absolute",
      left: -40,
      top: "50%",
      transform: "translateY(-50%)",
      opacity: 0,
      transition: "opacity 0.2s ease-in-out",
    }}
  >
    <IconButton size="small" onClick={handleCopy}>
      <ContentCopy fontSize="small" />
    </IconButton>
  </Box>

  {/* 消息内容 */}
  <Box>{content}</Box>
</Box>
```

---

### 3. 复制到剪贴板

**实现原理：Clipboard API**

```typescript
const handleCopy = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    // 显示成功提示（可选）
  } catch (err) {
    console.error("复制失败:", err);
  }
};
```

**用户体验增强：**

- 复制成功后图标临时变为 ✓（Check）
- 使用 `useState` + `setTimeout` 控制图标切换

```tsx
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(content);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// 渲染
<IconButton onClick={handleCopy}>
  {copied ? <Check /> : <ContentCopy />}
</IconButton>;
```

---

## 样式设计（参考 Gemini）

### 整体布局

````
┌──────────────────────────────────────────────────────────────────┐
│  [复制按钮]   HumanMessage 内容（右对齐，深色背景圆角）            │
│              ┌──────────────────────────────────────────────┐    │
│              │  用户发送的消息内容                           │    │
│              └──────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│  [AI 头像]   AIMessage 内容（左对齐，无背景/浅背景）              │
│              ┌──────────────────────────────────────────────┐    │
│              │  # Markdown 标题                              │    │
│              │  正文内容...                                  │    │
│              │  ```python                                    │    │
│              │  print("代码块")                              │    │
│              │  ```                                          │    │
│              ├──────────────────────────────────────────────┤    │
│              │  [复制] [重新生成] [👍] [👎]                   │    │
│              └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
````

### Gemini 样式特点

| 元素         | HumanMessage                  | AIMessage                            |
| ------------ | ----------------------------- | ------------------------------------ |
| **对齐**     | 右对齐                        | 左对齐                               |
| **背景**     | 深色圆角卡片 (`action.hover`) | 无背景 / 透明                        |
| **圆角**     | `borderRadius: 20px`          | 无                                   |
| **头像**     | 无（或右侧用户头像）          | 左侧 AI 图标                         |
| **工具栏**   | 悬浮时左侧显示复制            | 底部固定显示（复制、重新生成、反馈） |
| **最大宽度** | 约 70%                        | 约 80%                               |

### MUI sx 样式参考

```tsx
// HumanMessage 样式
const humanMessageSx = {
  display: "flex",
  justifyContent: "flex-end",
  mb: 2,
};

const humanBubbleSx = {
  maxWidth: "70%",
  bgcolor: "action.hover",
  borderRadius: 5,
  px: 2.5,
  py: 1.5,
  color: "text.primary",
};

// AIMessage 样式
const aiMessageSx = {
  display: "flex",
  alignItems: "flex-start",
  gap: 1.5,
  mb: 2,
};

const aiContentSx = {
  flex: 1,
  maxWidth: "80%",
  // Markdown 样式覆盖
  "& p": { my: 1 },
  "& h1, & h2, & h3": { mt: 2, mb: 1 },
  "& pre": {
    borderRadius: 2,
    overflow: "auto",
    my: 1.5,
  },
  "& code": {
    bgcolor: "action.hover",
    px: 0.5,
    borderRadius: 0.5,
    fontSize: "0.875em",
  },
  "& ul, & ol": { pl: 3 },
  "& blockquote": {
    borderLeft: 3,
    borderColor: "divider",
    pl: 2,
    color: "text.secondary",
  },
};
```

---

## 组件结构

```
src/pages/chat/components/
├── message-item.tsx        # 消息项组件（本文档目标）
├── markdown-content.tsx    # Markdown 渲染组件（可选拆分）
├── message-actions.tsx     # 消息操作按钮组（可选拆分）
└── index.tsx               # 导出
```

---

## 完整组件骨架

```tsx
// src/pages/chat/components/message-item.tsx
import { useState } from "react";
import { Box, IconButton, Avatar } from "@mui/material";
import {
  ContentCopy,
  Check,
  Refresh,
  ThumbUp,
  ThumbDown,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";

interface MessageItemProps {
  message: Message;
  onRegenerate?: (id: string | number) => void;
}

export function MessageItem({ message, onRegenerate }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isAI = message.role === "ai";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isAI) {
    return (
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
        {/* AI 头像 */}
        <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
          ✦
        </Avatar>

        {/* AI 内容 */}
        <Box sx={{ flex: 1, maxWidth: "80%" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>

          {/* 底部工具栏 */}
          <Box sx={{ display: "flex", gap: 0.5, mt: 1 }}>
            <IconButton size="small" onClick={handleCopy}>
              {copied ? (
                <Check fontSize="small" />
              ) : (
                <ContentCopy fontSize="small" />
              )}
            </IconButton>
            <IconButton size="small" onClick={() => onRegenerate?.(message.id)}>
              <Refresh fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <ThumbUp fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <ThumbDown fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    );
  }

  // HumanMessage
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        mb: 2,
        position: "relative",
        "&:hover .human-actions": { opacity: 1 },
      }}
    >
      {/* 悬浮操作按钮 */}
      <Box
        className="human-actions"
        sx={{
          position: "absolute",
          right: "calc(70% + 8px)",
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0,
          transition: "opacity 0.2s",
        }}
      >
        <IconButton size="small" onClick={handleCopy}>
          {copied ? (
            <Check fontSize="small" />
          ) : (
            <ContentCopy fontSize="small" />
          )}
        </IconButton>
      </Box>

      {/* 消息气泡 */}
      <Box
        sx={{
          maxWidth: "70%",
          bgcolor: "action.hover",
          borderRadius: 5,
          px: 2.5,
          py: 1.5,
        }}
      >
        {message.content}
      </Box>
    </Box>
  );
}
```

---

## 性能优化建议

### 1. Markdown 渲染缓存

对于长对话，使用 `useMemo` 缓存渲染结果：

```tsx
const renderedContent = useMemo(
  () => <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>,
  [content],
);
```

### 2. 虚拟列表（长对话场景）

当消息数量超过 50 条时，考虑使用虚拟列表：

- `react-window` / `react-virtuoso`
- 只渲染可视区域内的消息

---

## 依赖清单

```json
{
  "dependencies": {
    "react-markdown": "^9.x",
    "remark-gfm": "^4.x",
    "react-syntax-highlighter": "^15.x"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.x"
  }
}
```

---

## 验收标准

- [ ] AIMessage 正确渲染 Markdown（标题、列表、代码块、表格）
- [ ] AIMessage 代码块有语法高亮
- [ ] AIMessage 底部显示操作按钮（复制、重新生成、反馈）
- [ ] HumanMessage 右对齐，深色圆角背景
- [ ] HumanMessage 悬浮时左侧显示复制按钮
- [ ] 复制功能正常工作，图标有反馈
- [ ] Light/Dark 模式下样式正确
