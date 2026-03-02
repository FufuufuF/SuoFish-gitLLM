/** fetchMore 的返回类型，只包含分页元数据 */
export interface LoadMoreResult {
  nextCursor?: string;
  hasMore: boolean;
}