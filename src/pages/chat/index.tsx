import { Box } from "@mui/material";
import { ChatInput, MessageList } from "./components";
import { useMessage } from "./hooks/use-message";
import type { Message } from "./types";

const MOCK: Message[] = [
  {
    id: 1,
    role: 0,
    content: "Hello",
  },
  {
    id: 2,
    role: 1,
    content: `
    # 标题1
    ## 标题2
    ### 标题3
    #### 标题4
    ##### 标题5
    ###### 标题6
    
    **加粗**
    *斜体*
    ***加粗斜体***
    ~~删除线~~
    
    > 引用
    
    - 列表1
    - 列表2
    - 列表3
    
    1. 列表1
    2. 列表2
    3. 列表3
    
    `,
  },
];

export function ChatPage() {
  const { sendMessage } = useMessage();
  const handleSend = async (content: string) => {
    const { ai_message } = await sendMessage(content);
    console.log(ai_message);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        width: "100%",
        height: "100%",
      }}
    >
      <Box sx={{ width: "100%" }}>
        <MessageList messages={MOCK} />
      </Box>
      <Box sx={{ width: "80%" }}>
        <ChatInput onSend={handleSend} />
      </Box>
    </Box>
  );
}
