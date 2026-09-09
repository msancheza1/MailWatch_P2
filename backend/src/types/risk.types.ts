export type RiskCategory =
  | "Safe"
  | "Suspicious"
  | "Malicious";


export interface RiskResult {
  score: number;
  category: RiskCategory;
  reasons: string[];
}


export interface EmailAnalysisInput {
  sender: string;
  subject: string;
  content: string;
  urls?: string[];
}