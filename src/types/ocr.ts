export type OcrStatus = "queued" | "processing" | "completed" | "failed";

export interface OcrEmailItem {
  id: string;
  sender: string;
  subject: string;
  filename: string;
  fileSize: string;
  receivedAt: string;
  status: OcrStatus;
  ocrJobId: string;
  extractedFields: number;
}
