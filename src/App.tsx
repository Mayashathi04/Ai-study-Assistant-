import React, { useState, useEffect } from "react";
import { 
  loadNotes, saveNotes, 
  loadQuizzes, saveQuizzes, 
  loadFlashcardSets, saveFlashcardSets, 
  loadStudyPlans, saveStudyPlans, 
  loadProgress, saveProgress, 
  updateStreakAndAddLog 
} from "./utils/storage";
import { NotesMaterial, Quiz, FlashcardSet, StudyPlan, UserProgressState } from "./types";

// Component imports
import Dashboard from "./components/Dashboard";
import Summarizer from "./components/Summarizer";
import Tutor from "./components/Tutor";
import QuizView from "./components/QuizView";
import FlashcardView from "./components/FlashcardView";
import Planner from "./components/Planner";

// Icons imports
import { 
  Sparkles, BookOpen, GraduationCap, ClipboardCheck, 
  Layers, Calendar, ChevronRight, Menu, X, Flame, 
  BarChart2, Award 
} from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core synchronized states
  const [notes, setNotes] = useState<NotesMaterial[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [progress, setProgress] = useState<UserProgressState>({
    streak: 0,
    lastStudyDate: null,
    totalQuizzesTaken: 0,
    totalSummariesCreated: 0,
    totalFlashcardsReviewed: 0,
    totalTutorQuestions: 0,
    totalPlansCreated: 0,
    studyLogs: []
  });

  // Pull initial records from Localstorage on Mount
  useEffect(() => {
    setNotes(loadNotes());
    setQuizzes(loadQuizzes());
    setSets(loadFlashcardSets());
    setPlans(loadStudyPlans());
    setProgress(loadProgress());
  }, []);

  // Update study activities statistics & maintain daily streak logs
  const handleUpdateLogs = (
    type: "summary" | "chat" | "quiz" | "flashcard" | "schedule", 
    title: string, 
    detail: string,
    score?: number
  ) => {
    const updatedProgress = updateStreakAndAddLog(type, title, detail, score);
    setProgress(updatedProgress);
  };

  // State mutators with synchronized storage persistence
  const handleSaveNotes = (updatedNotes: NotesMaterial[]) => {
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
  };

  const handleSaveQuizzes = (updatedQuizzes: Quiz[]) => {
    setQuizzes(updatedQuizzes);
    saveQuizzes(updatedQuizzes);
  };

  const handleSaveSets = (updatedSets: FlashcardSet[]) => {
    setSets(updatedSets);
    saveFlashcardSets(updatedSets);
  };

  const handleSavePlans = (updatedPlans: StudyPlan[]) => {
    setPlans(updatedPlans);
    saveStudyPlans(updatedPlans);
  };

  // Navigations mapping
  const menuItems = [
    { id: "dashboard", label: "Workstation Dashboard", icon: BarChart2, color: "text-zinc-600" },
    { id: "summarizer", label: "Notes Summarizer (OCR)", icon: BookOpen, color: "text-amber-500" },
    { id: "tutor", label: "Socrates AI Tutor", icon: GraduationCap, color: "text-indigo-500" },
    { id: "quiz", label: "Practice Quizzes", icon: ClipboardCheck, color: "text-emerald-500" },
    { id: "flashcards", label: "Active Flashcards", icon: Layers, color: "text-pink-500" },
    { id: "planner", label: "Timeline Planner", icon: Calendar, color: "text-sky-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-800 flex flex-col md:flex-row antialiased select-none" id="app_frame">
      {/* SIDEBAR FOR DESKTOP & SLIDEOUT FOR RESPONSIVE MOBILE */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 text-neutral-100 flex flex-col justify-between border-r border-zinc-900 transition-transform md:translate-x-0 md:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="side_navigation"
      >
        <div className="flex-1 flex flex-col py-6 px-4 space-y-8 overflow-y-auto">
          {/* Main Workstation brand */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold font-mono">
                📚
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white block">AI Study Workstation</h1>
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest block">Standard Edition</span>
              </div>
            </div>
            {/* Close side panel button for responsive mobile */}
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden text-zinc-400 hover:text-white p-1 rounded"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Continual Daily streak ticker info inside rail */}
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-900 flex items-center justify-between">
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Revision Streak</span>
              <span className="text-xs font-black text-white">{progress.streak} continuous days</span>
            </div>
            <div className={`p-1.5 rounded-lg flex items-center justify-center ${progress.streak > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
              <Flame className="w-4 h-4 fill-current" />
            </div>
          </div>

          {/* Menu options selector links */}
          <nav className="space-y-1 text-left">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest block mb-2 px-2">Core workbenches</span>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected 
                      ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" 
                      : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`}
                  id={`nav_btn_${item.id}`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="flex-1">{item.label}</span>
                  {isSelected && <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info blocks */}
        <div className="p-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-medium space-y-1 select-none">
          <p>© 2026 Study Assistant Workspace</p>
          <p>Powered by DeepMind Gemini 3.5</p>
        </div>
      </aside>

      {/* OVERLAY FOR SIDESLIDE MOBILE DRAWER */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* MAIN CONTENT RUNTIME BODY */}
      <main className="flex-1 flex flex-col min-w-0" id="main_workbench">
        {/* TOP COMPRESS INTEGRATION CONTAINER */}
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            {/* Nav Menu trigger icon for responsive mobile */}
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="md:hidden border border-neutral-200 p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-50 shadow-xs"
              title="Open Navigation"
              id="mobile_menu_trigger"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-left">
              <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider block">Active Workbench</span>
              <p className="font-extrabold text-neutral-800 text-sm tracking-tight uppercase">
                {menuItems.find(m => m.id === currentTab)?.label || "Workspace"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full font-bold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5 fill-current text-indigo-500 animate-pulse" /> Socrates Live
            </span>
          </div>
        </header>

        {/* MODULE ROUTER CONTAINER EXPOSING ACTIVE TABS */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {currentTab === "dashboard" && (
            <Dashboard 
              progress={progress} 
              onNavigate={setCurrentTab} 
              savedNotesCount={notes.length} 
            />
          )}

          {currentTab === "summarizer" && (
            <Summarizer 
              savedNotes={notes} 
              onSaveNotes={handleSaveNotes} 
              onUpdateLogs={handleUpdateLogs} 
            />
          )}

          {currentTab === "tutor" && (
            <Tutor 
              savedNotes={notes} 
              onUpdateLogs={handleUpdateLogs} 
            />
          )}

          {currentTab === "quiz" && (
            <QuizView 
              savedNotes={notes} 
              savedQuizzes={quizzes} 
              onSaveQuizzes={handleSaveQuizzes} 
              onUpdateLogs={handleUpdateLogs} 
            />
          )}

          {currentTab === "flashcards" && (
            <FlashcardView 
              savedNotes={notes} 
              savedSets={sets} 
              onSaveSets={handleSaveSets} 
              onUpdateLogs={handleUpdateLogs} 
            />
          )}

          {currentTab === "planner" && (
            <Planner 
              savedPlans={plans} 
              onSavePlans={handleSavePlans} 
              onUpdateLogs={handleUpdateLogs} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
