import { AuditRunRecord, ContextType, TargetTone } from "../types";

export const CONTEXT_LABELS: Record<ContextType, { label: string; domain: string; description: string }> = {
  candidate_feedback: {
    label: "Candidate Feedback",
    domain: "Talent Acquisition",
    description: "Post-interview assessment notes shared with hiring committees or candidates.",
  },
  interview_summary: {
    label: "Interview Summary",
    domain: "Technical Recruiting",
    description: "Structured debrief summarizing technical scores, architecture rubrics, and hiring signals.",
  },
  recruiter_email: {
    label: "Recruiter Outreach",
    domain: "Candidate Engagement",
    description: "Direct candidate correspondence regarding role fit, compensation bands, and next steps.",
  },
  performance_report: {
    label: "Performance Report",
    domain: "People Operations",
    description: "Quarterly or annual engineering and leadership performance review synthesis.",
  },
  executive_brief: {
    label: "Executive Brief",
    domain: "Leadership Ops",
    description: "Board or VP-level operational status update requiring crisp, uninflated prose.",
  },
};

export const TONE_PROFILES: Record<TargetTone, { label: string; summary: string; cadence: string }> = {
  professional: {
    label: "Professional",
    summary: "Direct, objective, enterprise-standard communication with zero filler.",
    cadence: "Active voice · Measured sentence length · Formal clarity",
  },
  polished: {
    label: "Polished",
    summary: "Executive-ready editorial flow with smooth transitions and authoritative tone.",
    cadence: "Refined syntax · High cohesion · Nuanced diplomacy",
  },
  conversational: {
    label: "Conversational",
    summary: "Warm, approachable, first-person human delivery suited for direct outreach.",
    cadence: "Natural contractions · Warm opening · Personable rhythm",
  },
};

export const INITIAL_AUDIT_RECORDS: AuditRunRecord[] = [
  {
    id: "run-9042",
    title: "Staff Distributed Systems Engineer — Technical Debrief (Priya Nair)",
    timestamp: "2026-10-10 08:42:19",
    latencyMs: 640,
    input: {
      raw_text:
        "It is worth noting that the candidate, Priya Nair, participated in the Staff Distributed Systems Engineer technical assessment on October 8, 2026. Based on the aforementioned evaluation parameters, she achieved an overall rubric score of 4.6/5.0 and 94% on the Raft consensus debugging module. Furthermore, it can be observed that her explanations regarding gRPC backpressure and P99 latency reduction from 180ms to 42ms at Stripe were highly comprehensive in nature. However, in terms of areas for improvement, it should be mentioned that she took 14 minutes longer than the allocated 45-minute window to finalize the schema migration edge cases. In conclusion, the system recommends advancing Priya Nair to the Hiring Committee stage for the L6 platform role.",
      target_tone: "professional",
      context_type: "interview_summary",
    },
    output: {
      detected_flaws: [
        "It is worth noting that the candidate",
        "Based on the aforementioned evaluation parameters",
        "Furthermore, it can be observed that",
        "were highly comprehensive in nature",
        "However, in terms of areas for improvement, it should be mentioned that",
        "In conclusion, the system recommends",
      ],
      preserved_entities: [
        "Priya Nair",
        "Staff Distributed Systems Engineer",
        "October 8, 2026",
        "4.6/5.0",
        "94%",
        "Raft consensus",
        "gRPC backpressure",
        "P99 latency",
        "180ms to 42ms",
        "Stripe",
        "14 minutes",
        "45-minute window",
        "Hiring Committee",
        "L6",
      ],
      humanized_text:
        "Priya Nair completed her Staff Distributed Systems Engineer technical assessment on October 8, 2026, earning an overall rubric score of 4.6/5.0 and 94% on the Raft consensus debugging module. She walked through her work at Stripe with strong clarity, particularly how she handled gRPC backpressure and cut P99 latency from 180ms to 42ms. The one pacing note is that she needed 14 minutes beyond the standard 45-minute window to wrap up the schema migration edge cases. Even so, her technical depth clearly supports advancing Priya Nair to the Hiring Committee stage for the L6 platform role.",
      factuality_verification: {
        status: "PASSED",
        confidence_score: 0.99,
        discrepancy_notes:
          "14/14 critical entities preserved verbatim. All quantitative metrics (4.6/5.0, 94%, 180ms to 42ms, 14 minutes, 45-minute window) and recommendation intent verified with zero hallucination.",
      },
    },
  },
  {
    id: "run-9041",
    title: "Senior Product Designer Candidate Feedback — Marcus Vance",
    timestamp: "2026-10-10 08:31:05",
    latencyMs: 580,
    input: {
      raw_text:
        "Dear Marcus Vance, I am writing this automated communication to delve into the feedback from your portfolio review held on October 6, 2026 with VP of Design Elena Rostova. As a testament to your skillset, the panel was impressed by your WCAG 2.2 AA design system overhaul at Figma which reduced component token debt by 38% across 14 product squads. Nevertheless, uponholistic evaluation of the operational parameters, we require deeper hands-on prototyping fluency in WebGL shaders and 60fps canvas telemetry for our Q1 2027 spatial analytics suite. Therefore, we will not be proceeding with your application for Req #PD-409 at this juncture.",
      target_tone: "conversational",
      context_type: "candidate_feedback",
    },
    output: {
      detected_flaws: [
        "I am writing this automated communication to delve into",
        "As a testament to your skillset",
        "Nevertheless, uponholistic evaluation of the operational parameters",
        "at this juncture",
      ],
      preserved_entities: [
        "Marcus Vance",
        "October 6, 2026",
        "VP of Design",
        "Elena Rostova",
        "WCAG 2.2 AA",
        "Figma",
        "38%",
        "14 product squads",
        "WebGL shaders",
        "60fps canvas telemetry",
        "Q1 2027",
        "Req #PD-409",
      ],
      humanized_text:
        "Hi Marcus Vance, thank you again for walking VP of Design Elena Rostova and the panel through your portfolio on October 6, 2026. The team was genuinely impressed by how you led the WCAG 2.2 AA design system overhaul at Figma and cut component token debt by 38% across 14 product squads. For Req #PD-409, however, our upcoming Q1 2027 spatial analytics suite requires someone with deeper hands-on prototyping experience in WebGL shaders and 60fps canvas telemetry right out of the gate. Because of that specific gap, we won't be moving forward right now, though we really appreciated the rigor of your work.",
      factuality_verification: {
        status: "PASSED",
        confidence_score: 0.98,
        discrepancy_notes:
          "All 12 protected entities—including names (Marcus Vance, Elena Rostova), dates (October 6, 2026, Q1 2027), technical standards (WCAG 2.2 AA, WebGL shaders, 60fps canvas telemetry), and Req #PD-409—remain intact.",
      },
    },
  },
  {
    id: "run-9040",
    title: "Principal ML Infrastructure Outreach — Dr. Kenji Takahashi",
    timestamp: "2026-10-10 08:14:52",
    latencyMs: 615,
    input: {
      raw_text:
        "Greetings Dr. Kenji Takahashi. In today's rapidly evolving technological landscape, your recent NeurIPS 2025 publication on FP8 FlashAttention-3 kernel optimization caught our algorithmic attention. It is imperative to state that Anthropic's Compute Cluster team in Seattle is seeking a Principal ML Systems Architect (Req #ML-882). The compensation structure encompasses a base salary band of $285,000–$320,000 USD plus $450,000 in annual equity grants, managing a 2,048-node H200 training fabric. Kindly advise if your temporal availability permits a 25-minute introductory alignment call on October 15, 2026.",
      target_tone: "polished",
      context_type: "recruiter_email",
    },
    output: {
      detected_flaws: [
        "Greetings Dr. Kenji Takahashi.",
        "In today's rapidly evolving technological landscape",
        "caught our algorithmic attention",
        "It is imperative to state that",
        "The compensation structure encompasses",
        "Kindly advise if your temporal availability permits",
        "introductory alignment call",
      ],
      preserved_entities: [
        "Dr. Kenji Takahashi",
        "NeurIPS 2025",
        "FP8 FlashAttention-3",
        "Anthropic",
        "Seattle",
        "Principal ML Systems Architect",
        "Req #ML-882",
        "$285,000–$320,000 USD",
        "$450,000",
        "2,048-node H200",
        "25-minute",
        "October 15, 2026",
      ],
      humanized_text:
        "Dear Dr. Kenji Takahashi, I recently read your NeurIPS 2025 paper on FP8 FlashAttention-3 kernel optimization and wanted to reach out directly. Anthropic's Compute Cluster team in Seattle is hiring a Principal ML Systems Architect (Req #ML-882) to lead architecture across our 2,048-node H200 training fabric. The role offers a base salary band of $285,000–$320,000 USD along with $450,000 in annual equity grants. Would you be open to a 25-minute introductory call on October 15, 2026 to discuss how your work aligns with our roadmap?",
      factuality_verification: {
        status: "PASSED",
        confidence_score: 1.0,
        discrepancy_notes:
          "100% entity preservation verified across compensation figures ($285,000–$320,000 USD, $450,000), hardware specs (2,048-node H200, FP8 FlashAttention-3), Req #ML-882, and target date (October 15, 2026).",
      },
    },
  },
  {
    id: "run-9039",
    title: "Q3 Engineering Performance Review — Jordan Alvarez (Flagged Audit Demo)",
    timestamp: "2026-10-10 07:55:10",
    latencyMs: 530,
    input: {
      raw_text:
        "During the Q3 2026 evaluation cycle, Staff Security Engineer Jordan Alvarez spearheaded the SOC2 Type II zero-trust migration across 19 production Kubernetes clusters. Furthermore, it is worth noting that incident MTTR dropped from 48 minutes to 11.5 minutes while maintaining 99.994% SLA uptime and saving $142,000 in annualized SIEM ingestion costs. In conclusion, Jordan Alvarez exceeded expectations with a 4.8/5.0 rating.",
      target_tone: "professional",
      context_type: "performance_report",
    },
    output: {
      detected_flaws: [
        "During the Q3 2026 evaluation cycle",
        "spearheaded the",
        "Furthermore, it is worth noting that",
        "In conclusion,",
      ],
      preserved_entities: [
        "Q3 2026",
        "Staff Security Engineer",
        "Jordan Alvarez",
        "SOC2 Type II",
        "19 production Kubernetes clusters",
        "MTTR",
        "48 minutes to 11.5 minutes",
        "99.994% SLA",
        "$142,000",
        "SIEM",
        "4.8/5.0",
      ],
      humanized_text:
        "In Q3 2026, Staff Security Engineer Jordan Alvarez led our SOC2 Type II zero-trust migration across 19 production Kubernetes clusters. His work cut incident MTTR from 48 minutes to 11.5 minutes, sustained a 99.994% SLA uptime, and reduced annualized SIEM ingestion spend by $142,000. Jordan Alvarez consistently exceeded expectations this quarter, earning a 4.8/5.0 performance rating.",
      factuality_verification: {
        status: "PASSED",
        confidence_score: 0.99,
        discrepancy_notes:
          "All 11 critical metrics and security domain identifiers (Q3 2026, SOC2 Type II, 19 production Kubernetes clusters, 48 minutes to 11.5 minutes, 99.994% SLA, $142,000, 4.8/5.0) verified intact.",
      },
    },
  },
];
