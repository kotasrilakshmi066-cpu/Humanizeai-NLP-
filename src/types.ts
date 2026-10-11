export type TargetTone = "professional" | "polished" | "conversational";

export type ContextType =
  | "candidate_feedback"
  | "interview_summary"
  | "recruiter_email"
  | "performance_report"
  | "executive_brief";

export interface FactualityVerification {
  status: "PASSED" | "FLAGGED";
  confidence_score: number;
  discrepancy_notes: string;
}

export interface RefinementOutput {
  detected_flaws: string[];
  preserved_entities: string[];
  humanized_text: string;
  factuality_verification: FactualityVerification;
}

export interface RefinementInput {
  raw_text: string;
  target_tone: TargetTone;
  context_type: ContextType;
}

export interface AuditRunRecord {
  id: string;
  title: string;
  timestamp: string;
  latencyMs: number;
  input: RefinementInput;
  output: RefinementOutput;
}
