export interface NotesMaterial {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  fileType: 'text' | 'pdf' | 'image';
  createdAt: string;
  summary?: string;
  keyConcepts?: string[];
}

export type QuestionType = 'mcq' | 'tf' | 'short';

export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[]; // MCQs only
  correctAnswer: string; // "True"/"False" for TF, text for short, or index/value for mcq
  explanation: string;
  type: QuestionType;
}

export interface Quiz {
  id: string;
  title: string;
  materialId?: string;
  questions: QuizQuestion[];
  score?: number; // Last score achieved (percent)
  completedCount?: number;
  lastCompletedAt?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  familiarity?: 'new' | 'review' | 'known';
}

export interface FlashcardSet {
  id: string;
  title: string;
  materialId?: string;
  cards: Flashcard[];
}

export interface ScheduleItem {
  id: string;
  dayNumber: number;
  date: string;
  topic: string;
  suggestedDuration: string; // e.g. "2 hours"
  tasksList: string[];
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  examName: string;
  examDate: string;
  subjects: string[];
  studyHours: number;
  weeksRemaining: number;
  dailySchedule: ScheduleItem[];
  createdAt: string;
}

export interface StudyLog {
  id: string;
  type: 'summary' | 'chat' | 'quiz' | 'flashcard' | 'schedule';
  title: string;
  detail: string;
  timestamp: string;
  score?: number;
}

export interface UserProgressState {
  streak: number;
  lastStudyDate: string | null;
  totalQuizzesTaken: number;
  totalSummariesCreated: number;
  totalFlashcardsReviewed: number;
  totalTutorQuestions: number;
  totalPlansCreated: number;
  studyLogs: StudyLog[];
}

export interface TutorChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
}
