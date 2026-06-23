import { NotesMaterial, Quiz, FlashcardSet, StudyPlan, UserProgressState, StudyLog } from "../types";

const NOTES_KEY = "ai_study_assistant_notes";
const QUIZ_KEY = "ai_study_assistant_quizzes";
const FLASHCARD_KEY = "ai_study_assistant_flashcards";
const PLAN_KEY = "ai_study_assistant_plans";
const PROGRESS_KEY = "ai_study_assistant_progress";

export function loadNotes(): NotesMaterial[] {
  try {
    const data = localStorage.getItem(NOTES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes: NotesMaterial[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function loadQuizzes(): Quiz[] {
  try {
    const data = localStorage.getItem(QUIZ_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveQuizzes(quizzes: Quiz[]) {
  localStorage.setItem(QUIZ_KEY, JSON.stringify(quizzes));
}

export function loadFlashcardSets(): FlashcardSet[] {
  try {
    const data = localStorage.getItem(FLASHCARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFlashcardSets(sets: FlashcardSet[]) {
  localStorage.setItem(FLASHCARD_KEY, JSON.stringify(sets));
}

export function loadStudyPlans(): StudyPlan[] {
  try {
    const data = localStorage.getItem(PLAN_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStudyPlans(plans: StudyPlan[]) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
}

const DEFAULT_PROGRESS: UserProgressState = {
  streak: 0,
  lastStudyDate: null,
  totalQuizzesTaken: 0,
  totalSummariesCreated: 0,
  totalFlashcardsReviewed: 0,
  totalTutorQuestions: 0,
  totalPlansCreated: 0,
  studyLogs: []
};

export function loadProgress(): UserProgressState {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    if (!data) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(data);
    
    // Automatically calculate/maintain streak on load
    let updatedProgress = { ...DEFAULT_PROGRESS, ...parsed };
    updatedProgress = checkAndAdjustStreak(updatedProgress);
    return updatedProgress;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: UserProgressState) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

// Automatically tracks study days and calculates continuous streak count
function checkAndAdjustStreak(progress: UserProgressState): UserProgressState {
  if (!progress.lastStudyDate) return progress;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(progress.lastStudyDate);
  lastDate.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If last study was yesterday or today, keep streak.
  // If last study was more than 1 day ago, streak breaks!
  if (diffDays > 1) {
    progress.streak = 0;
  }
  
  return progress;
}

export function updateStreakAndAddLog(type: StudyLog["type"], title: string, detail: string, score?: number) {
  const progress = loadProgress();
  const today = new Date();
  const dateStr = today.toDateString();
  
  // Log item
  const newLog: StudyLog = {
    id: `log_${Date.now()}`,
    type,
    title,
    detail,
    timestamp: today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + today.toLocaleDateString(),
    score
  };
  
  // Calculate Streak increment
  if (progress.lastStudyDate !== dateStr) {
    if (progress.lastStudyDate) {
      const lastDate = new Date(progress.lastStudyDate);
      lastDate.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        progress.streak += 1;
      } else if (diffDays > 1) {
        progress.streak = 1;
      }
    } else {
      progress.streak = 1;
    }
    progress.lastStudyDate = dateStr;
  }
  
  // Increment counters
  if (type === "summary") progress.totalSummariesCreated += 1;
  if (type === "quiz") progress.totalQuizzesTaken += 1;
  if (type === "flashcard") progress.totalFlashcardsReviewed += 1;
  if (type === "chat") progress.totalTutorQuestions += 1;
  if (type === "schedule") progress.totalPlansCreated += 1;
  
  // Append log (keep last 50 entries)
  progress.studyLogs = [newLog, ...progress.studyLogs].slice(0, 50);
  
  saveProgress(progress);
  return progress;
}
