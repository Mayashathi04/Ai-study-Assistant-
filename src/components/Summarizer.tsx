import React, { useState, useRef } from "react";
import { NotesMaterial } from "../types";
import { FileText, Upload, Plus, CheckCircle, FileCode, Trash2, ArrowRight, Loader2, Sparkles, BookOpen } from "lucide-react";

interface SummarizerProps {
  savedNotes: NotesMaterial[];
  onSaveNotes: (notes: NotesMaterial[]) => void;
  onUpdateLogs: (type: "summary" | "chat" | "quiz" | "flashcard" | "schedule", title: string, detail: string) => void;
}

export default function Summarizer({ savedNotes, onSaveNotes, onUpdateLogs }: SummarizerProps) {
  const [selectedNote, setSelectedNote] = useState<NotesMaterial | null>(null);
  const [inputText, setInputText] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("English");
  const [summaryFormat, setSummaryFormat] = useState("bullet_points");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const allowedTypes = [
      "text/plain", 
      "application/pdf", 
      "image/png", 
      "image/jpeg", 
      "image/webp"
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".docx")) {
      setAlertMessage("Unsupported file format. Please upload text, PDF, JPG, or PNG notes.");
      return;
    }

    const reader = new FileReader();
    if (file.type === "text/plain") {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      reader.readAsText(file);
    } else {
      // Base64 file for PDF or Images
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        setFileDetails({
          name: file.name,
          base64: base64String,
          type: file.type || "application/pdf"
        });
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleTriggerSummary = async () => {
    if (!title.trim()) {
      setAlertMessage("Please enter a title or filename for your study material.");
      return;
    }
    if (!inputText.trim() && !fileDetails) {
      setAlertMessage("Please enter some study text notes or upload a notes document file.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          fileData: fileDetails?.base64 || null,
          mimeType: fileDetails?.type || null,
          language,
          format: summaryFormat,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to contact study assistant model.");
      }

      const result = await response.json();

      const newNote: NotesMaterial = {
        id: `note_${Date.now()}`,
        title: title.trim(),
        content: inputText.slice(0, 1000) || `Uploaded notes: ${fileDetails?.name || "document"}`,
        wordCount: inputText ? inputText.split(/\s+/).length : 500,
        fileType: fileDetails ? (fileDetails.type.startsWith("image") ? "image" : "pdf") : "text",
        createdAt: new Date().toLocaleDateString(),
        summary: result.summary,
        keyConcepts: result.keyConcepts,
      };

      const updated = [newNote, ...savedNotes];
      onSaveNotes(updated);
      setSelectedNote(newNote);
      onUpdateLogs(
        "summary",
        newNote.title,
        `Created standard layout notes summary in ${language} format.`
      );

      // Reset Form fields
      setInputText("");
      setTitle("");
      setFileDetails(null);
    } catch (error: any) {
      console.error(error);
      setAlertMessage(`Summarization Error: ${error.message || "Something went wrong."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDeleteNote = () => {
    if (pendingDeleteId) {
      const filtered = savedNotes.filter((n) => n.id !== pendingDeleteId);
      onSaveNotes(filtered);
      if (selectedNote?.id === pendingDeleteId) {
        setSelectedNote(null);
      }
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" id="summarizer_view">
      {/* Sidebar: Previously Synthesized Summaries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" /> My Study Notes
          </h2>
          {selectedNote && (
            <button
              onClick={() => setSelectedNote(null)}
              className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg px-2.5 py-1.5 transition-colors border border-orange-100"
              id="new_summary_btn"
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm min-h-[300px] lg:min-h-[500px] max-h-[550px] overflow-y-auto space-y-3">
          {savedNotes.length === 0 ? (
            <div className="text-center py-20 text-neutral-400 space-y-3">
              <FileText className="w-10 h-10 mx-auto stroke-1 text-neutral-300" />
              <p className="text-xs font-semibold">Your workspace is clean.</p>
              <p className="text-[11px] text-neutral-400 px-4">Upload documents on the right to auto-generate markdown concept summaries here.</p>
            </div>
          ) : (
            savedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between hover:border-amber-400 hover:shadow-sm ${
                  selectedNote?.id === note.id
                    ? "bg-amber-50/50 border-amber-400 shadow-sm"
                    : "bg-white border-neutral-200"
                }`}
                id={`note_item_${note.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-neutral-800 text-sm line-clamp-1">{note.title}</h3>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="text-neutral-400 hover:text-red-500 p-1 hover:bg-neutral-100 rounded"
                      title="Delete saved summary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{note.content}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 mt-3 pt-2 border-t border-neutral-50">
                  <span className="flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5" /> {note.fileType.toUpperCase()}
                  </span>
                  <span>{note.createdAt}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="lg:col-span-2">
        {!selectedNote ? (
          /* NEW SUMMARY INPUT SCREEN */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-2 border-b border-neutral-100 pb-4">
              <h2 className="text-xl font-bold text-neutral-800 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" /> Synthesize Study Notes
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Paste raw lecture bullet points, lecture transcripts, or upload chapter files. The Gemini model analyzes, extracts key concepts, and outputs formatted study material.
              </p>
            </div>

            {/* Note Title Input */}
            <div className="space-y-1.5 focus-within:text-orange-600">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Note Title / Subject Header</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Computer Networks - Chapter 4 (TCP Congestion)"
                className="w-full text-sm border border-neutral-200 rounded-xl px-4 py-3 placeholder-neutral-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-neutral-800 font-medium"
                id="sum_title_input"
              />
            </div>

            {/* Drag & Drop File Upload Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Upload Notes File</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? "border-orange-500 bg-orange-50/50" 
                    : fileDetails 
                      ? "border-emerald-400 bg-emerald-50/20" 
                      : "border-neutral-200 hover:border-neutral-300 bg-neutral-50/40"
                }`}
                id="drag_drop_zone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                
                {fileDetails ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-700 truncate max-w-xs mx-auto">
                      {fileDetails.name}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                      Ready for OCR Processing
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileDetails(null);
                      }}
                      className="block text-[11px] text-red-500 hover:underline mx-auto mt-1"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-neutral-500">
                    <div className="w-10 h-10 bg-neutral-100 text-neutral-600 rounded-xl flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-700">
                      Drag & Drop files or <span className="text-orange-500 underline">Browse files</span>
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      Supports: TXT, PDF, PNG, JPG notes (Ideal for scanning blackboard slides)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Notepad Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Manual Notes Notepad</label>
                {inputText && (
                  <span className="text-[10px] text-neutral-400 font-medium bg-neutral-100 px-2 py-0.5 rounded">
                    {inputText.split(/\s+/).length} words
                  </span>
                )}
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Or paste your plain study material notes, lecture transcripts, syllabus topics right here..."
                rows={6}
                disabled={fileDetails !== null}
                className="w-full text-sm border border-neutral-200 rounded-xl px-4 py-3 placeholder-neutral-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all text-neutral-800 disabled:bg-neutral-50 disabled:cursor-not-allowed leading-relaxed"
                id="sum_textarea_input"
              />
            </div>

            {/* Summary Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Language Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Explanation Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-xs font-semibold border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-700 outline-none focus:border-orange-500 text-left"
                >
                  <option value="English">English (Standard)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Tanglish">Tanglish (Tamil + English combo)</option>
                  <option value="Hinglish">Hinglish (Hindi + English combo)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Malayalam">Malayalam (മലയാളം)</option>
                </select>
              </div>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Summary Depth Format</label>
                <select
                  value={summaryFormat}
                  onChange={(e) => setSummaryFormat(e.target.value)}
                  className="w-full text-xs font-semibold border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-700 outline-none focus:border-orange-500 text-left"
                >
                  <option value="bullet_points">Structured Outline & Key Bullets</option>
                  <option value="detailed">In-Depth Textbook Explanations</option>
                  <option value="cheat_sheet">Compact Cheat Sheet (Pre-Exam Quick Drill)</option>
                </select>
              </div>
            </div>

            {/* Summarize Action button */}
            <div className="pt-2">
              <button
                onClick={handleTriggerSummary}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 shadow-md transition-colors text-sm disabled:bg-neutral-300 disabled:cursor-not-allowed"
                id="summarize_submit_btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing Notes (Performing OCR)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" /> Auto-Summarize & Extract Core Concepts
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* SELECTED SUMMARY PRESENTATION SCREEN */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] text-orange-600 font-bold tracking-wider uppercase bg-orange-50 px-2 py-0.5 rounded">
                  Notes Summary
                </span>
                <h2 className="text-xl font-bold text-neutral-800 tracking-tight">{selectedNote.title}</h2>
                <p className="text-[10px] text-neutral-400">Created on {selectedNote.createdAt} &bull; {selectedNote.wordCount} words analyzed</p>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="self-start md:self-auto text-xs text-neutral-500 hover:text-neutral-800 font-semibold border border-neutral-200 hover:border-neutral-300 rounded-xl px-4 py-2 bg-neutral-50 transition-colors"
                id="return_workspace_btn"
              >
                Back to Workspace
              </button>
            </div>

            {/* Extracted Key Concepts Box */}
            {selectedNote.keyConcepts && selectedNote.keyConcepts.length > 0 && (
              <div className="space-y-2 bg-neutral-50/50 p-4 border border-neutral-200/60 rounded-xl">
                <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5">
                  🔑 Extracted Key Vocabulary (OCR)
                </h3>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {selectedNote.keyConcepts.map((concept, index) => {
                    const splitIdx = concept.indexOf(":");
                    const term = splitIdx !== -1 ? concept.substring(0, splitIdx) : concept;
                    const def = splitIdx !== -1 ? concept.substring(splitIdx + 1) : "";

                    return (
                      <div 
                        key={index} 
                        className="bg-white hover:bg-neutral-100 text-neutral-800 text-xs border border-neutral-200 rounded-lg p-3 w-full shadow-sm"
                      >
                        <strong className="text-amber-700 font-bold">{term.trim()}</strong>
                        {def && <span className="text-neutral-500 font-medium text-xs leading-relaxed block mt-1">{def.trim()}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formatted Summary Presentation */}
            <div className="space-y-3">
              <h3 className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                📄 Generative Structured Markdown Summary
              </h3>
              <div className="prose prose-neutral prose-sm max-w-none text-neutral-700 leading-relaxed space-y-4 font-normal bg-neutral-50/30 p-5 rounded-2xl border border-neutral-100">
                {selectedNote.summary ? (
                  selectedNote.summary.split("\n").map((line, idx) => {
                    // Quick crude markdown rendering
                    if (line.trim().startsWith("###")) {
                      return <h4 key={idx} className="text-sm font-bold text-neutral-800 mt-4 mb-2">{line.replace("###", "").trim()}</h4>;
                    }
                    if (line.trim().startsWith("##")) {
                      return <h3 key={idx} className="text-base font-extrabold text-neutral-900 mt-5 border-b border-neutral-100 pb-1">{line.replace("##", "").trim()}</h3>;
                    }
                    if (line.trim().startsWith("#")) {
                      return <h2 key={idx} className="text-lg font-black text-neutral-900 mt-6 border-b border-amber-200 pb-1">{line.replace("#", "").trim()}</h2>;
                    }
                    if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                      const textWithBold = line.replace(/^-\s*|^\*\s*/, "");
                      return (
                        <li key={idx} className="ml-4 list-disc text-xs text-neutral-600 pl-1 my-1">
                          {renderLineWithBold(textWithBold)}
                        </li>
                      );
                    }
                    if (line.trim() === "") return <div key={idx} className="h-2"></div>;
                    return <p key={idx} className="text-xs text-neutral-600 my-1">{renderLineWithBold(line)}</p>;
                  })
                ) : (
                  <p className="text-xs text-neutral-400 italic">No summary details generated.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-neutral-800 text-sm">Study Workspace Alert</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{alertMessage}</p>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
            >
              Understand & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Delete Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-neutral-800 text-sm">Delete Study Note</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Are you sure you want to permanently clear this study note summary material? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                No, Keep It
              </button>
              <button
                onClick={confirmDeleteNote}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small regex replacement helper for bold markdown in summary
function renderLineWithBold(line: string) {
  const parts = line.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-neutral-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
