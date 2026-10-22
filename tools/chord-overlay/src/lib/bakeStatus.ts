export interface BakeStatus {
  phase: "idle" | "rendering" | "encoding-overlay" | "compositing" | "done" | "error";
  framesDone: number;
  framesTotal: number;
  message?: string;
  updatedAt: string;
}
