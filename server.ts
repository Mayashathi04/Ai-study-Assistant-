import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing with limits to handle PDFs and Image uploads in Base64
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Gemini client to prevent crash on boot if API key is missing
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in your local environment or the Secrets panel.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Helper to sanitize strings returned from Gemini in case they have markdown block enclosures
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. NOTES SUMMARIZER API
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, fileData, mimeType, language = "English", format = "bullet_points" } = req.body;
    const ai = getGeminiClient();

    let systemInstruction = "You are an expert academic tutor. Summarize study notes thoroughly, extracting key insights, core formulas, essential definitions, and practical examples.";
    if (language !== "English") {
      systemInstruction += ` Provide the summary in the requested language/dialect: ${language}.`;
    }

    let summaryStylePrompt = "";
    if (format === "bullet_points") {
      summaryStylePrompt = "Generate a structured outline using bullet points. Focus on key core concepts, formulas, and definitions. Group them logically under clear headings.";
    } else if (format === "detailed") {
      summaryStylePrompt = "Generate a comprehensive, detailed textbook-style explanation. Expand on definitions, provide clear theoretical breakdowns, and note real-world applications of each concept.";
    } else {
      summaryStylePrompt = "Create a compact, highly condensed summary (limit to key points and an executive summary table) ideal for quick revision right before an exam.";
    }

    const contents: any[] = [];

    // If base64 file is attached, let Gemini analyze the document/image directly
    if (fileData && mimeType) {
      contents.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      });
      contents.push({
        text: `Attached is a study guide/notes document or image of file-type ${mimeType}. Perform OCR, extract all content, and summarize it. Language requirement: ${language}. Style mandate: ${summaryStylePrompt}. Make sure to produce clean, elegant markdown with headers, bold terms, and lists.`
      });
    } else if (text) {
      contents.push({
        text: `Summarize the following notes. Language requirement: ${language}. Style mandate: ${summaryStylePrompt}.\n\nNotes Material:\n${text}`
      });
    } else {
      return res.status(400).json({ error: "Missing study material text or attached file." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for accurate fact extraction
      }
    });

    // Generate a set of key concepts/vocabulary terms separately using structural response
    const keyTermsContents: any[] = [];
    if (fileData && mimeType) {
      keyTermsContents.push({ inlineData: { data: fileData, mimeType } });
      keyTermsContents.push({ text: "Extract exactly 4-7 key core academic terms or concepts found in this document and provide a fast 1-sentence explanation of each." });
    } else if (text) {
      keyTermsContents.push({ text: `Extract exactly 4-7 key core academic terms or concepts from this text and provide a 1-sentence explanation of each.\n\nNotes:\n${text}` });
    }

    const keyTermsResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: keyTermsContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "An array of 4-7 key core terms paired with short definitions, formatted like 'Term: Definition'."
        }
      }
    });

    let keyConcepts: string[] = [];
    try {
      const parsed = JSON.parse(cleanJsonString(keyTermsResponse.text || "[]"));
      if (Array.isArray(parsed)) keyConcepts = parsed;
    } catch {
      keyConcepts = ["Key Concept Extraction Completed"];
    }

    res.json({
      summary: response.text || "No summary generated.",
      keyConcepts
    });

  } catch (error: any) {
    console.error("Error in notes summarization:", error);
    res.status(500).json({ error: error.message || "Summarization failed." });
  }
});

// 2. AI TUTOR CHAT API
app.post("/api/tutor/chat", async (req, res) => {
  try {
    const { messages, language = "English", focusTopic = "" } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages history array is required." });
    }

    const ai = getGeminiClient();

    let systemContext = `You are "Socrates - The AI Study Tutor", a highly supportive, knowledgeable, and patient academic tutor.
Your goal is to explain difficult topics in extremely simple, approachable terms using real-world analogies, examples, and encouraging feedback.
Language Settings: You must respond in the language or dialect: ${language}. For example, if the student requests "Tanglish", explain using a mix of Tamil and English words or colloquial slang common in student chat. If they request "Hindi-English/Hinglish", do similarly. Otherwise, use simple and concise language.`;

    if (focusTopic) {
      systemContext += ` The focus topic of the current learning module is "${focusTopic}". Tailor analogies and explanations to reinforce this topic.`;
    }

    // Format chat messages correctly for gemini
    const formattedContents = messages.map(msg => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemContext,
        temperature: 0.7, // touch more creative for simple descriptions and analogies
      }
    });

    res.json({
      reply: response.text || "I was unable to formulate an explanation. Could you rephrase your question?"
    });

  } catch (error: any) {
    console.error("Error in AI Tutor chat:", error);
    res.status(500).json({ error: error.message || "Tutor failed to explain concept." });
  }
});

// 3. PRACTICE QUIZ GENERATOR API
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { notesText, fileData, mimeType, count = 5, types = ["mcq", "tf", "short"] } = req.body;
    const ai = getGeminiClient();

    const contents: any[] = [];
    let promptBase = `Act as an assessment constructor. Generate exactly ${count} mock practice questions based strictly on the materials provided. Match these constraints:
Question Types allowed: ${types.join(", ")}.
If 'mcq' is chosen, questions should have an 'options' array containing exactly 4 strings, and 'correctAnswer' should be the single string matching one of those options.
If 'tf' is chosen, 'options' should be exactly ["True", "False"], and 'correctAnswer' must be either "True" or "False".
If 'short' is chosen, generate a concise study concept question where 'correctAnswer' is a model answer (1-2 sentences), and do not include the options field.
Ensure that other parameters are clean. Return a valid JSON array of questions matching the structural format. Include clear, educational reviews in the 'explanation' field of each question detailing WHY the answer is correct to help students study effectively.`;

    if (fileData && mimeType) {
      contents.push({ inlineData: { data: fileData, mimeType } });
      contents.push({ text: `${promptBase}\nGenerate assessment items directly from the attached document.` });
    } else if (notesText) {
      contents.push({ text: `${promptBase}\n\nStudy Notes:\n${notesText}` });
    } else {
      return res.status(400).json({ error: "No text or document provided to build the quiz." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The quiz question. Clear and challenging." },
              type: { type: Type.STRING, description: "Must be 'mcq', 'tf', or 'short'." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of exactly 4 strings for MCQ, or ['True', 'False'] for TF. Omit or leave empty for 'short'."
              },
              correctAnswer: { type: Type.STRING, description: "The exact matching answer text. Must be matching one of the options for MCQ/TF, or a model solution for short answer." },
              explanation: { type: Type.STRING, description: "Detailed, encouraging scientific or historical explanation of why this answer is correct." }
            },
            required: ["question", "type", "correctAnswer", "explanation"]
          }
        },
        temperature: 0.4
      }
    });

    res.json({
      questions: JSON.parse(cleanJsonString(response.text || "[]"))
    });

  } catch (error: any) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ error: error.message || "Quiz generation failed." });
  }
});

// 4. FLASHCARDS GENERATOR API
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { notesText, fileData, mimeType, count = 8 } = req.body;
    const ai = getGeminiClient();

    const contents: any[] = [];
    const promptBase = `Act as an active-recall coach. Generate exactly ${count} educational flashcards from the study material.
- For each card, write a clear, focused question, cue, or term for the 'front'.
- Write a concise, targeted answer, fact, or formula on the 'back' (keep under 25 words per side for effective memorization).
Return a valid JSON array of flashcard objects containing 'front' and 'back' properties.`;

    if (fileData && mimeType) {
      contents.push({ inlineData: { data: fileData, mimeType } });
      contents.push({ text: `${promptBase}\nExtract from attached document.` });
    } else if (notesText) {
      contents.push({ text: `${promptBase}\n\nStudy Notes:\n${notesText}` });
    } else {
      return res.status(400).json({ error: "Missing study notes to construct flashcards." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: "The active recall question or formula prompt." },
              back: { type: Type.STRING, description: "The short answer, definition, or key takeaway." }
            },
            required: ["front", "back"]
          }
        },
        temperature: 0.5
      }
    });

    res.json({
      cards: JSON.parse(cleanJsonString(response.text || "[]"))
    });

  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    res.status(500).json({ error: error.message || "Flashcard generation failed." });
  }
});

// 5. STUDY PLANNER API
app.post("/api/generate-study-schedule", async (req, res) => {
  try {
    const { examName, examDate, subjects, studyHoursPerDay = 2, language = "English" } = req.body;
    if (!examName || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Exam name and subjects list are required parameters." });
    }

    const ai = getGeminiClient();

    // Create a 7-day study schedule template covering subjects in detail
    const prompt = `Act as an academic advisor and productivity coach. Create a structured 7-day exam preparation schedule styled as key milestones.
Target Exam: ${examName}.
Exam Date or Timeline context: ${examDate}.
List of subjects to master: ${subjects.join(", ")}.
Available daily study hours: ${studyHoursPerDay} hours per day.
Language setting: ${language}.

Generate exactly 7 daily schedule blocks (Days 1 to 7). Specialize each day for strategic preparation leading up to the target. For each day, provide:
- A targeted, specific focus topic integrating the subjects.
- A recommended suggested duration based on the daily hours allocated.
- A list of 3 actionable micro-tasks for that day (e.g. "Review formulas", "Take active recall mock quiz", "Draw a mind-map").
Return a JSON array matching the required structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayNumber: { type: Type.INTEGER, description: "Day count from 1 to 7." },
              date: { type: Type.STRING, description: "A simple scheduling marker, e.g. 'Day 1: Theory Focus' or equivalent dynamic tag based on Exam Date." },
              topic: { type: Type.STRING, description: "The descriptive core subject study topic for the day." },
              suggestedDuration: { type: Type.STRING, description: "Formatted suggested length e.g. '2.5 hours'." },
              tasksList: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 3 clear, actionable micro-tasks for the day."
              }
            },
            required: ["dayNumber", "date", "topic", "suggestedDuration", "tasksList"]
          }
        },
        temperature: 0.4
      }
    });

    res.json({
      schedule: JSON.parse(cleanJsonString(response.text || "[]"))
    });

  } catch (error: any) {
    console.error("Error creating study planner:", error);
    res.status(500).json({ error: error.message || "Failed to make study schedule." });
  }
});

// -------------------------------------------------------------
// Dev & Build Static Middleware Integration
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from compiled dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Study Assistant Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
