import React from "react";
import { UserProgressState } from "../types";
import { Flame, BookOpen, Star, HelpCircle, Layers, Calendar, ArrowRight, ClipboardCheck, Sparkles } from "lucide-react";

interface DashboardProps {
  progress: UserProgressState;
  onNavigate: (tab: string) => void;
  savedNotesCount: number;
}

export default function Dashboard({ progress, onNavigate, savedNotesCount }: DashboardProps) {
  const formatType = (type: string) => {
    switch (type) {
      case "summary": return { label: "Summary Created", color: "bg-amber-100 text-amber-700 border-amber-200" };
      case "chat": return { label: "Tutor Lesson", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
      case "quiz": return { label: "Quiz Attempt", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      case "flashcard": return { label: "Flashcards Study", color: "bg-pink-100 text-pink-700 border-pink-200" };
      case "schedule": return { label: "Study Plan", color: "bg-sky-100 text-sky-700 border-sky-200" };
      default: return { label: "Study Activity", color: "bg-gray-100 text-gray-700 border-gray-200" };
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "summary": return <BookOpen className="w-4 h-4 text-amber-600" />;
      case "chat": return <HelpCircle className="w-4 h-4 text-indigo-600" />;
      case "quiz": return <ClipboardCheck className="w-4 h-4 text-emerald-600" />;
      case "flashcard": return <Layers className="w-4 h-4 text-pink-600" />;
      case "schedule": return <Calendar className="w-4 h-4 text-sky-600" />;
      default: return <Sparkles className="w-4 h-4 text-violet-600" />;
    }
  };

  // Dynamic user message based on streaks/actions
  const getMotivationalMessage = () => {
    if (progress.streak === 0) {
      return "Start your learning session today to build a continuous study streak! 🌟";
    }
    if (progress.streak <= 2) {
      return "Off to a fantastic start! Consistency is the secret to mastery. Keep it up! ⚡";
    }
    return `Incredible! A ${progress.streak}-day study streak? You are absolutely crushing your academic milestones! 🔥`;
  };

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard_view">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-zinc-800 to-black p-8 text-white shadow-lg border border-neutral-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-orange-400 rotate-12" />
        </div>
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800/80 px-3 py-1 text-xs font-semibold text-orange-300 border border-neutral-700">
            <Sparkles className="h-3 w-3 text-orange-400" /> Powered by Gemini 3.5 AI
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Accelerate Your Learning, <br />
            <span className="text-orange-400">Study Smarter.</span>
          </h1>
          <p className="text-neutral-300 text-sm md:text-base leading-relaxed">
            Welcome to your AI workspace. Upload lecture notes, syllabus chapters, or materials, and let the AI instantly explain core theories, construct review flashcards, and run mock practice exams.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate("summarizer")}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 transition-colors text-sm shadow-md"
              id="start_learning_btn"
            >
              Upload Your First Notes
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Stat */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between transition-all hover:border-neutral-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">Study Streak</p>
            <p className="text-3xl font-black text-neutral-900 tracking-tight flex items-baseline gap-1">
              {progress.streak} <span className="text-xs text-neutral-500 font-normal">days</span>
            </p>
          </div>
          <div className={`p-3 rounded-xl flex items-center justify-center ${progress.streak > 0 ? 'bg-orange-50 text-orange-500 border border-orange-100 animate-pulse' : 'bg-neutral-50 text-neutral-300 border border-neutral-100'}`}>
            <Flame className="w-8 h-8 fill-current" />
          </div>
        </div>

        {/* Notes Synthesized */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between transition-all hover:border-neutral-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">Study Materials</p>
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {savedNotesCount}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>

        {/* Quizzes Completed */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between transition-all hover:border-neutral-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">Quizzes Taken</p>
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {progress.totalQuizzesTaken}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-xl">
            <ClipboardCheck className="w-8 h-8" />
          </div>
        </div>

        {/* Flashcards Reviewed */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between transition-all hover:border-neutral-300">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">Cards Mastered</p>
            <p className="text-3xl font-black text-neutral-900 tracking-tight">
              {progress.totalFlashcardsReviewed}
            </p>
          </div>
          <div className="p-3 bg-pink-50 text-pink-500 border border-pink-100 rounded-xl">
            <Layers className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
          💡
        </div>
        <p className="text-sm font-medium text-neutral-700">
          {getMotivationalMessage()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Toolboxes panel */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-neutral-800 tracking-tight">Study Toolboxes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notes Summarizer */}
            <div 
              onClick={() => onNavigate("summarizer")}
              className="group bg-white p-6 rounded-2xl border border-neutral-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-44"
              id="summarizer_tile"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold group-hover:bg-amber-100 transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-800 group-hover:text-amber-700 transition-colors">Notes Summarizer</h3>
                <p className="text-xs text-neutral-500 line-clamp-2">Convert heavy documents and study notes into dense structured markdown outlines instantly.</p>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-amber-600 pt-2 border-t border-neutral-50">
                <span>Start Reviewing</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* AI Tutor */}
            <div 
              onClick={() => onNavigate("tutor")}
              className="group bg-white p-6 rounded-2xl border border-neutral-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-44"
              id="tutor_tile"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold group-hover:bg-indigo-100 transition-colors">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-800 group-hover:text-indigo-700 transition-colors">Socrates AI Tutor</h3>
                <p className="text-xs text-neutral-500 line-clamp-2">Ask doubts, solve hard problems, and learn theories decoded in plain English, Tamil, Hindi, or Tanglish.</p>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 pt-2 border-t border-neutral-50">
                <span>Ask Socrates</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Quizzes */}
            <div 
              onClick={() => onNavigate("quiz")}
              className="group bg-white p-6 rounded-2xl border border-neutral-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-44"
              id="quiz_tile"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold group-hover:bg-emerald-100 transition-colors">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-800 group-hover:text-emerald-700 transition-colors">Practice Quizzes</h3>
                <p className="text-xs text-neutral-500 line-clamp-2">Test your analytical skills with auto-crafted MCQs, True/False, and feedback explanations.</p>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 pt-2 border-t border-neutral-50">
                <span>Take a Test</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Flashcards */}
            <div 
              onClick={() => onNavigate("flashcards")}
              className="group bg-white p-6 rounded-2xl border border-neutral-200 hover:border-pink-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-44"
              id="flashcards_tile"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center font-bold group-hover:bg-pink-100 transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-800 group-hover:text-pink-700 transition-colors">Active Flashcards</h3>
                <p className="text-xs text-neutral-500 line-clamp-2">Revise efficiently with digital study card sets leveraging interactive flip-animations.</p>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-pink-600 pt-2 border-t border-neutral-50">
                <span>Flip Cards</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent logs & streaks logs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-800 tracking-tight">Recent Study Logs</h2>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 max-h-[370px] overflow-y-auto">
            {progress.studyLogs.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 space-y-2">
                <BookOpen className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs">No active study logs yet.</p>
                <p className="text-[11px] text-neutral-400">Summaries completed or quizzes tried will display here.</p>
              </div>
            ) : (
              progress.studyLogs.map((log) => {
                const badge = formatType(log.type);
                return (
                  <div key={log.id} className="flex gap-3 items-start border-b border-neutral-50 pb-3 last:border-0 last:pb-0">
                    <div className="bg-neutral-50 p-2 rounded-xl mt-0.5 border border-neutral-100 flex-shrink-0">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border uppercase ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">{log.timestamp}</span>
                      </div>
                      <h4 className="font-bold text-neutral-800 text-xs truncate">{log.title}</h4>
                      <p className="text-neutral-500 text-[11px] leading-relaxed line-clamp-2">{log.detail}</p>
                      {log.score !== undefined && (
                        <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                          Score: {log.score}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
