export const sseService = {
  getMarketUpdatesUrl(marketId: string): string {
    return `/api/markets/${marketId}/stream`;
  },
};
