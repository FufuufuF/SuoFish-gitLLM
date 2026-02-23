export function getChatInputPlaceholder(isMerging: boolean, isMerged: boolean) {
    if (isMerging) return "正在合并分支...";
    if (isMerged) return "该分支已合并归档";
    return "请输入消息..."
}