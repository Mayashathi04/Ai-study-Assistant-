import React, { useState, useEffect, useRef } from "react";
import { TutorChatMessage, NotesMaterial } from "../types";
import { HelpCircle, Send, Sparkles, Languages, RefreshCw, User, GraduationCap, ChevronDown, Check } from "lucide-react";

interface TutorProps {
  savedNotes: NotesMaterial[];
  onUpdateLogs: (type: "summary" | "chat" | "quiz" | "flashcard" | "schedule", title: string, detail: string) => void;
}

export default function Tutor({ savedNotes, onUpdateLogs }: TutorProps) {
  const [messages, setMessages] = useState<TutorChatMessage[]>([
    {
      id: "welcome",
      sender: "tutor",
      text: "Hello! I am Socrates, your AI Academic Tutor. Feel free to ask me anything regarding your study notes or any subject you are mastering. I can break down heavy technical concepts into simple analogies, and explain them in English, Hindi, Tamil, Hinglish, or Tanglish. What are we studying today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("English");
  const [focusTopic, setFocusTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages list grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send prompt
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg: TutorChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
          language,
          focusTopic,
        }),
      });

      if (!response.ok) {
        throw new Error("Tutor lost connection. Please check your credentials or API key.");
      }

      const result = await response.json();

      const tutorMsg: TutorChatMessage = {
        id: `tutor_${Date.now()}`,
        sender: "tutor",
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages(p => [...p, tutorMsg]);
      
      // Update system statistics & streaks
      onUpdateLogs(
        "chat",
        userMsg.text.length > 30 ? userMsg.text.substring(0, 30) + "..." : userMsg.text,
        `Discussed topic in ${language} with Focus: ${focusTopic || "General doubts"}`
      );

    } catch (err: any) {
      console.error(err);
      setMessages(p => [
        ...p,
        {
          id: `tutor_err_${Date.now()}`,
          sender: "tutor",
          text: `Ah! It seems I lost connection to the primary model server. Error: ${err.message || "Failed to fetch response."}. Please configure your API secret.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setShowResetConfirm(true);
  };

  const confirmResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "tutor",
        text: "Hello! Communication link reset. What concept can I simplify for you now? Remember, you can select any uploaded note as a tutor focus topic above.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    ]);
    setShowResetConfirm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in" id="tutor_view">
      {/* Sidebar - Tutor Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-neutral-800 tracking-wider uppercase border-b border-neutral-100 pb-3 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-500" /> Tutor settings
          </h2>

          {/* Target language */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-indigo-500" /> Explanation Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-xs font-semibold border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-700 outline-none focus:border-indigo-500"
            >
              <option value="English">English (Standard)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Tanglish">Tanglish (Tamil + English combo)</option>
              <option value="Hinglish">Hinglish (Hindi + English combo)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Malayalam">Malayalam (മലയാളം)</option>
            </select>
            <p className="text-[10px] text-neutral-400 leading-normal">
              Selecting "Tanglish" or "Hinglish" allows colloquial blending for extremely intuitive native dialect analogies.
            </p>
          </div>

          {/* Material focus selector */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1">
              🎯 Study Content Focus
            </label>
            <select
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              className="w-full text-xs font-semibold border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-700 outline-none focus:border-indigo-500"
            >
              <option value="">No Active Focus (General doubts)</option>
              {savedNotes.map((note) => (
                <option key={note.id} value={note.title}>
                  {note.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 leading-normal">
              Select an uploaded summary to focus Socrates' guidance on that specific chapter context.
            </p>
          </div>

          {/* Quick doubts suggested questions list */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Suggested Prompts
            </label>
            <div className="space-y-1.5">
              {[
                { label: "Give me an analogy for Agile Methedology", q: "What is Agile Methedology? Explain using a simple analogy." },
                { label: "What is TCP vs UDP?", q: "Can you explain the main difference between TCP and UDP with a funny real-world example?" },
                { label: "Explain Binary Search in Tanglish", q: "Explain the concept of Binary Search algorithm using Tanglish." }
              ].map((p, i) => (
                <button
                  key={i}
                  disabled={isLoading}
                  onClick={() => {
                    setInputText(p.q);
                    setLanguage(p.label.includes("Tanglish") ? "Tanglish" : language);
                  }}
                  className="w-full text-left bg-neutral-50 hover:bg-neutral-100 text-[11px] text-neutral-600 font-medium p-2 rounded-lg border border-neutral-100 block truncate transition-colors"
                >
                  &ldquo;{p.label}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Reset discussion */}
          <div className="pt-2">
            <button
              onClick={handleResetChat}
              className="w-full text-left text-xs text-red-500 hover:text-white border border-red-200 hover:bg-red-500 rounded-lg p-2 transition-colors flex items-center justify-center gap-1.5 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Chat Log
            </button>
          </div>
        </div>
      </div>

      {/* Main chat interface frame */}
      <div className="lg:col-span-3 bg-white border border-neutral-200 rounded-2xl shadow-sm flex flex-col h-[550px] relative overflow-hidden">
        {/* Chat header banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-4 text-white flex items-center justify-between border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center border border-indigo-400/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Socrates <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-widest">&bull; Online Tutor</span>
              </h3>
              <p className="text-[10px] text-indigo-200">
                {focusTopic ? `Active focus: "${focusTopic}"` : "Interactive dialogue learning workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-indigo-800/60 text-indigo-100 border border-indigo-700/80 px-2.5 py-1 rounded-full font-bold">
              {language} Mode
            </span>
          </div>
        </div>

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => {
            const isTutor = msg.sender === "tutor";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isTutor ? "self-start text-left" : "self-end flex-row-reverse text-right ml-auto"
                }`}
              >
                {/* Profile icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${
                    isTutor
                      ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                      : "bg-neutral-800 text-neutral-100 border-neutral-700"
                  }`}
                >
                  {isTutor ? <GraduationCap className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Box */}
                <div className="space-y-1">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed font-normal shadow-sm ${
                      isTutor
                        ? "bg-white border border-neutral-200 text-neutral-800 rounded-tl-none whitespace-pre-wrap"
                        : "bg-indigo-600 text-white rounded-tr-none text-left"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="block text-[9px] text-neutral-400 px-1 font-medium select-none">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Model Loading indicator bubble */}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] self-start text-left animate-pulse">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-500" />
              </div>
              <div className="space-y-1">
                <div className="p-3 bg-white border border-neutral-200 text-neutral-800 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                  <span className="font-semibold text-neutral-500">Socrates is formulating a simplified analogy...</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input prompt tray */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-200 bg-white flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              focusTopic
                ? `Ask Socrates about notes "${focusTopic}"...`
                : "Ask any academic doubt or type 'Explain Agile Methodology'..."
            }
            className="flex-1 text-xs border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-neutral-800 font-medium"
            id="tutor_message_input"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors disabled:bg-neutral-200 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-sm"
            id="tutor_send_btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Custom Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-neutral-800 text-sm">Reset Dialogue Link</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Are you sure you want to completely reset your active learning discussion with Socrates? Your current conversation logs will be cleared.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                No, Keep Chat
              </button>
              <button
                onClick={confirmResetChat}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
