import { create } from "zustand";

export interface ChartDataPoint {
  time: string;
  value: number;
}

interface ChartState {
  data: ChartDataPoint[];
  setData: (data: ChartDataPoint[]) => void;
  appendPoint: (point: ChartDataPoint) => void;
}

export const useChartStore = create<ChartState>((set) => ({
  data: [],
  setData: (data) => set({ data }),
  appendPoint: (point) =>
    set((state) => {
      const next = [...state.data, point];
      return { data: next.length > 100 ? next.slice(-100) : next };
    }),
}));
