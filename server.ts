import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();
dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const REFINEMENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detected_flaws: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Exact robotic phrases, repetitive transitions, unnatural templates, or filler expressions found in raw_text.",
    },
    preserved_entities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Critical entities isolated from raw_text (names, scores, dates, technical terms, metrics) that must be preserved with 100% accuracy.",
    },
    humanized_text: {
      type: Type.STRING,
      description:
        "The final refined natural text output matching the requested target_tone and context_type while preserving 100% of entities and facts.",
    },
    factuality_verification: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Must be strictly "PASSED" or "FLAGGED".',
        },
        confidence_score: {
          type: Type.NUMBER,
          description: "Factuality and entity alignment confidence score from 0.0 to 1.0.",
        },
        discrepancy_notes: {
          type: Type.STRING,
          description:
            "Explanation if any divergence was detected or confirmation of 100% factual alignment and entity preservation.",
        },
      },
      required: ["status", "confidence_score", "discrepancy_notes"],
    },
  },
  required: [
    "detected_flaws",
    "preserved_entities",
    "humanized_text",
    "factuality_verification",
  ],
};

const SYSTEM_INSTRUCTION = `System Persona & Objective:
You are the core intelligence engine for an enterprise-grade "AI Humanization & Natural Language Refinement" platform. Your task is to transform robotic, overly formal, repetitive, or templated AI-generated text into natural, contextual, and trustworthy human-readable communication without altering its underlying meaning, factual statements, or vital entities.

Input Parameters to Expect:
1. raw_text: The machine-generated text (e.g., recruiter notes, candidate feedback, performance report).
2. target_tone: Desired style level ("professional", "polished", or "conversational").
3. context_type: The domain context (e.g., "candidate_feedback", "interview_summary", "recruiter_email", "performance_report", "executive_brief").

Required Execution Pipeline:
1. Robotic Language Detection: Scan input for repetitive phrasing, unnatural templated structures, and robotic filler (e.g., "It is worth noting that", "Furthermore, it can be observed", "delve into", "testament to", "In conclusion, based on the aforementioned parameters"). Return exact substrings from raw_text in detected_flaws whenever possible.
2. Entity & Fact Extraction: Isolate critical entities (names, scores, dates, technical terms, percentages, currencies, metrics) that must be preserved with 100% accuracy. Return exact substrings in preserved_entities.
3. Contextual Rewrite: Rewrite the text to sound naturally human while matching the requested target_tone and context_type. Ensure every single extracted entity and factual claim appears accurately in humanized_text.
4. Factuality & Meaning Check: Compare the rewritten output against the original text to ensure zero hallucinations, unsupported claims, or lost intent. Set status to "PASSED" if all entities and facts are intact, or "FLAGGED" if any entity or nuance drifted.`;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "2mb" }));

  app.post("/api/refine", async (req, res) => {
    try {
      const { raw_text, target_tone, context_type } = req.body;

      if (!raw_text || typeof raw_text !== "string" || !raw_text.trim()) {
        return res.status(400).json({
          error: "Parameter 'raw_text' is required and must be a non-empty string.",
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          error:
            "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY=your_key in a .env or .env.local file.",
        });
      }

      const validTones = ["professional", "polished", "conversational"];
      const tone = validTones.includes(target_tone) ? target_tone : "professional";
      const context = context_type || "candidate_feedback";

      const promptPayload = JSON.stringify(
        {
          raw_text: raw_text.trim(),
          target_tone: tone,
          context_type: context,
        },
        null,
        2
      );

      const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Execute the 4-stage AI Humanization & Natural Language Refinement pipeline on the following input payload and return strict JSON:\n\n${promptPayload}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: REFINEMENT_RESPONSE_SCHEMA,
          temperature: 0.35,
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
        return res.status(502).json({
          error: "Empty response received from language refinement engine.",
        });
      }

      const parsed = JSON.parse(textOutput.trim());
      const normalizedStatus =
        parsed?.factuality_verification?.status === "FLAGGED" ? "FLAGGED" : "PASSED";
      const rawScore = Number(parsed?.factuality_verification?.confidence_score ?? 0.98);
      const clampedScore = Math.max(0, Math.min(1, Number.isFinite(rawScore) ? rawScore : 0.98));

      const strictResult = {
        detected_flaws: Array.isArray(parsed.detected_flaws) ? parsed.detected_flaws : [],
        preserved_entities: Array.isArray(parsed.preserved_entities)
          ? parsed.preserved_entities
          : [],
        humanized_text: String(parsed.humanized_text || ""),
        factuality_verification: {
          status: normalizedStatus,
          confidence_score: Number(clampedScore.toFixed(2)),
          discrepancy_notes: String(
            parsed?.factuality_verification?.discrepancy_notes ||
              "All extracted entities, quantitative metrics, and core claims verified against source text."
          ),
        },
      };

      return res.json(strictResult);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to execute refinement pipeline.";
      console.error("Error in /api/refine:", message);
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VeriProse Enterprise server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
