import React, { useState } from "react";
import { Quiz, QuizQuestion, NotesMaterial } from "../types";
import { ClipboardCheck, Sparkles, AlertCircle, Play, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCw, Loader2, HelpCircle } from "lucide-react";

interface QuizViewProps {
  savedNotes: NotesMaterial[];
  savedQuizzes: Quiz[];
  onSaveQuizzes: (quizzes: Quiz[]) => void;
  onUpdateLogs: (type: "summary" | "chat" | "quiz" | "flashcard" | "schedule", title: string, detail: string, score?: number) => void;
}

export default function QuizView({ savedNotes, savedQuizzes, onSaveQuizzes, onUpdateLogs }: QuizViewProps) {
  // Generation state
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [manualText, setManualText] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["mcq", "tf"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Active quiz session state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [scorePercent, setScorePercent] = useState(0);

  // Toggle question type selection
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // Generate Quiz action
  const handleGenerateQuiz = async () => {
    let sourceText = "";
    let quizTitle = "General Knowledge Quiz";

    if (selectedNoteId) {
      const selectedNote = savedNotes.find((n) => n.id === selectedNoteId);
      if (selectedNote) {
        sourceText = selectedNote.summary || selectedNote.content;
        quizTitle = `${selectedNote.title} Practice Exam`;
      }
    } else {
      sourceText = manualText.trim();
      quizTitle = "Manual Snippet Practice Drill";
    }

    if (!sourceText) {
      setAlertMessage("Please select a study note or paste mock notes chapters first.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notesText: sourceText,
          count: questionCount,
          types: selectedTypes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact assessment constructor service.");
      }

      const val = await response.json();
      if (!val.questions || val.questions.length === 0) {
        throw new Error("No quiz questions generated. Try adding more educational substance or notes.");
      }

      const generatedQuiz: Quiz = {
        id: `quiz_${Date.now()}`,
        title: quizTitle,
        materialId: selectedNoteId || undefined,
        questions: val.questions,
      };

      // Save to savedQuizzes
      const updatedList = [generatedQuiz, ...savedQuizzes];
      onSaveQuizzes(updatedList);

      // Launch active quiz
      setActiveQuiz(generatedQuiz);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setSubmittedAnswers(false);
      setQuizFinished(false);

    } catch (error: any) {
      console.error(error);
      setAlertMessage(`Quiz Generation Failure: ${error.message || "Something went wrong."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (submittedAnswers) return; // Locked
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Complete & Grade quiz
  const handleGradeQuiz = () => {
    if (!activeQuiz) return;

    let correctCount = 0;
    activeQuiz.questions.forEach((q) => {
      const userAns = userAnswers[q.id]?.trim().toLowerCase();
      const correctAns = q.correctAnswer?.trim().toLowerCase();
      
      if (q.type === 'short') {
        // Self-evaluated short answers always count as correct for completion,
        // or we check if user filled it out
        if (userAns && userAns.length > 5) {
          correctCount++;
        }
      } else {
        if (userAns === correctAns) {
          correctCount++;
        }
      }
    });

    const percent = Math.round((correctCount / activeQuiz.questions.length) * 100);
    setScorePercent(percent);
    setSubmittedAnswers(true);
  };

  const handleFinishQuiz = () => {
    if (!activeQuiz) return;
    setQuizFinished(true);

    // Save statistics in storage and logs
    const updated = savedQuizzes.map((q) => {
      if (q.id === activeQuiz.id) {
        return {
          ...q,
          score: scorePercent,
          completedCount: (q.completedCount || 0) + 1,
          lastCompletedAt: new Date().toLocaleDateString(),
        };
      }
      return q;
    });

    onSaveQuizzes(updated);
    onUpdateLogs("quiz", activeQuiz.title, `Finished dynamic revision quiz. Grade scored: ${scorePercent}%`, scorePercent);
  };

  const handleNextQuestion = () => {
    if (!activeQuiz) return;
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Start a past quiz
  const handleStartPastQuiz = (qz: Quiz) => {
    setActiveQuiz(qz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSubmittedAnswers(false);
    setQuizFinished(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" id="quizview_section">
      {/* Sidebar - Past Quizzes / Generate Custom */}
      {!activeQuiz && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
            <h2 className="text-sm font-bold text-neutral-800 tracking-wider uppercase border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              💡 Quiz Settings
            </h2>

            {/* Source select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Select Study Document Base</label>
              <select
                value={selectedNoteId}
                onChange={(e) => {
                  setSelectedNoteId(e.target.value);
                  setManualText(""); // Clear manual text
                }}
                className="w-full text-xs font-semibold border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-700 outline-none focus:border-emerald-500"
              >
                <option value="">Paste Manual Textbook Snippet Instead</option>
                {savedNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title} (Summary text)
                  </option>
                ))}
              </select>
            </div>

            {/* Manual note writing */}
            {!selectedNoteId && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Paste Notes Snippet</label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste textbook definitions, theory paragraphs, or formula indexes to generate a customized review quiz from..."
                  rows={4}
                  className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 placeholder-neutral-400 outline-none focus:border-emerald-500 transition-all text-neutral-800 leading-relaxed font-normal"
                />
              </div>
            )}

            {/* Question count */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block">Question Count</label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setQuestionCount(cnt)}
                    className={`text-xs font-bold py-2 border rounded-lg transition-all ${
                      questionCount === cnt
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block">Allowed Question Formats</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "mcq", label: "MCQ" },
                  { id: "tf", label: "T / F" },
                  { id: "short", label: "Short" },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeToggle(type.id)}
                    className={`text-[10px] font-bold py-2 border rounded-lg transition-all ${
                      selectedTypes.includes(type.id)
                        ? "bg-teal-50 border-teal-300 text-teal-700 shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-neutral-400">
                "Short" requests provide text inputs for open self-corrections.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGenerateQuiz}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 transition-colors text-sm disabled:bg-neutral-200 shadow-sm"
                id="generate_quiz_submit_btn"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Auto-Constructing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" /> Construct Mock Exam
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Quizzes List OR Active Quiz Session Frame */}
      <div className={`${activeQuiz ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
        {!activeQuiz ? (
          /* PAST QUIZZES ARCHIVE */
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-800 tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-500" /> Assessment Center
            </h2>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
              {savedQuizzes.length === 0 ? (
                <div className="text-center py-20 text-neutral-400 space-y-3 my-auto">
                  <ClipboardCheck className="w-12 h-12 mx-auto stroke-1 text-neutral-300" />
                  <h3 className="font-bold text-neutral-700 text-sm">No quizzes generated yet.</h3>
                  <p className="text-xs text-neutral-400 px-6 max-w-sm mx-auto">
                    Select a study note from the left workspace sidebar to instruct the AI to construct randomized Multiple Choice questionnaires.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedQuizzes.map((qz) => (
                    <div
                      key={qz.id}
                      className="border border-neutral-200 p-5 rounded-2xl bg-white hover:border-emerald-400 transition-all shadow-sm flex flex-col justify-between h-44 cursor-pointer"
                      onClick={() => handleStartPastQuiz(qz)}
                      id={`quiz_box_${qz.id}`}
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 tracking-wider font-bold uppercase px-2 py-0.5 rounded border border-emerald-100">
                          {qz.questions.length} Questions
                        </span>
                        <h3 className="font-bold text-neutral-800 text-xs line-clamp-2 pt-1">{qz.title}</h3>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-50 text-xs font-semibold">
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-neutral-400">Past score</p>
                          <p className="text-neutral-800 font-bold">
                            {qz.score !== undefined ? `${qz.score}%` : "Not attempted"}
                          </p>
                        </div>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm text-[11px]"
                          id={`start_quiz_btn_${qz.id}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE PRACTICE INTERACTIVE SESSION */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Practice Session
                </span>
                <h2 className="text-lg font-bold text-neutral-800 tracking-tight mt-1">{activeQuiz.title}</h2>
              </div>
              <button
                onClick={() => {
                  setShowQuitConfirm(true);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 rounded-xl px-3 py-1.5 font-semibold transition-colors"
              >
                Quit Quiz
              </button>
            </div>

            {/* Active Quiz Finished Report card */}
            {quizFinished ? (
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-800">Quiz Completed!</h3>
                  <p className="text-sm text-neutral-500">You completed {activeQuiz.questions.length} questions of {activeQuiz.title}.</p>
                </div>

                <div className="max-w-xs mx-auto bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-around shadow-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-400 font-semibold uppercase">Grade Scored</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tight">{scorePercent}%</p>
                  </div>
                  <div className="w-px h-10 bg-neutral-100"></div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-400 font-semibold uppercase">Status</p>
                    <p className={`text-base font-bold ${scorePercent >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {scorePercent >= 70 ? "Mastery Achieved" : "Review Concepts"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setUserAnswers({});
                      setSubmittedAnswers(false);
                      setQuizFinished(false);
                      setCurrentQuestionIndex(0);
                    }}
                    className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-neutral-300 text-xs font-bold rounded-lg px-4 py-2 bg-white text-neutral-700 hover:bg-neutral-50 transition-all shadow-sm"
                  >
                    <RotateCw className="w-4 h-4" /> Retry Quiz
                  </button>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-lg px-5 py-2 text-white transition-all shadow-sm"
                  >
                    Back to Center
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE QUESTION SELECTION AND FLOW */
              <div className="space-y-6">
                {/* Progress bar indices */}
                <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold">
                  <span>Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                  <span className="font-bold text-neutral-600">
                    {Math.round(((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-100">
                  <div
                    className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                  ></div>
                </div>

                {/* Specific active question container */}
                {(() => {
                  const q = activeQuiz.questions[currentQuestionIndex];
                  const chosenAnswer = userAnswers[q.id];
                  return (
                    <div className="space-y-5" key={q.id}>
                      {/* Plain question text */}
                      <div className="bg-neutral-50/50 border border-neutral-100 p-4 rounded-xl">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded inline-block mb-2">
                          {q.type.toUpperCase()} Format
                        </span>
                        <p className="text-sm font-bold text-neutral-800 leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Options answers visualizer */}
                      {q.type === "mcq" && q.options && (
                        <div className="grid grid-cols-1 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = chosenAnswer === opt;
                            let optionStyle = "border-neutral-200 bg-white hover:border-neutral-300";
                            
                            if (submittedAnswers) {
                              const isCorrect = q.correctAnswer === opt;
                              if (isCorrect) {
                                optionStyle = "border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold";
                              } else if (isSelected) {
                                optionStyle = "border-red-300 bg-red-50 text-red-800";
                              } else {
                                optionStyle = "border-neutral-100 bg-neutral-50/50 opacity-60 text-neutral-400";
                              }
                            } else if (isSelected) {
                              optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold shadow-sm";
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleAnswerSelect(q.id, opt)}
                                disabled={submittedAnswers}
                                className={`text-xs text-left p-3.5 border-2 rounded-xl transition-all flex items-center justify-between ${optionStyle}`}
                                id={`opt_btn_${optIdx}`}
                              >
                                <span>{opt}</span>
                                {submittedAnswers ? (
                                  q.correctAnswer === opt ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : isSelected ? (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  ) : null
                                ) : (
                                  <div className={`w-4 h-4 rounded-full border ${isSelected ? 'border-emerald-500 bg-emerald-500 flex items-center justify-center' : 'border-neutral-300'}`}>
                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False layout */}
                      {q.type === "tf" && (
                        <div className="grid grid-cols-2 gap-4">
                          {["True", "False"].map((tfVal) => {
                            const isSelected = chosenAnswer === tfVal;
                            let optionStyle = "border-neutral-200 bg-white hover:border-neutral-300";

                            if (submittedAnswers) {
                              const isCorrect = q.correctAnswer === tfVal;
                              if (isCorrect) {
                                optionStyle = "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold";
                              } else if (isSelected) {
                                optionStyle = "border-red-300 bg-red-50 text-red-700";
                              } else {
                                optionStyle = "border-neutral-100 bg-neutral-50/50 opacity-60 text-neutral-400";
                              }
                            } else if (isSelected) {
                              optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm";
                            }

                            return (
                              <button
                                key={tfVal}
                                onClick={() => handleAnswerSelect(q.id, tfVal)}
                                disabled={submittedAnswers}
                                className={`text-xs text-center p-5 border-2 rounded-xl font-semibold transition-all ${optionStyle}`}
                              >
                                {tfVal}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Short Answer text field layout */}
                      {q.type === "short" && (
                        <div className="space-y-4">
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-left">Your Study Theory Answer</label>
                          <textarea
                            value={chosenAnswer || ""}
                            onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                            disabled={submittedAnswers}
                            rows={3}
                            placeholder="Formulate your explanation here. After grading, Socrates will review your wording with the model key solution."
                            className="w-full text-xs border border-neutral-200 rounded-xl px-4 py-3 placeholder-neutral-400 outline-none focus:border-emerald-500 transition-all text-neutral-800 leading-relaxed font-normal bg-white disabled:bg-neutral-50"
                          />

                          {submittedAnswers && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left space-y-1.5">
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">Intel Model Solution</span>
                              <p className="text-xs text-neutral-700 font-medium leading-relaxed mt-1">
                                {q.correctAnswer}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation Callout Panel */}
                      {submittedAnswers && q.explanation && (
                        <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl text-left space-y-1 flex gap-3">
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg h-fit">
                            <HelpCircle className="w-4 h-4 text-blue-700" />
                          </div>
                          <div>
                            <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider block">Tutor Rationale Analysis</span>
                            <p className="text-xs text-neutral-700 font-normal leading-relaxed mt-0.5">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Question controls footer */}
                <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="inline-flex items-center gap-1 border border-neutral-200 hover:border-neutral-300 text-xs font-bold px-3 py-2 rounded-lg transition-colors bg-white text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4" /> Prev
                    </button>
                    <button
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === activeQuiz.questions.length - 1}
                      className="inline-flex items-center gap-1 border border-neutral-200 hover:border-neutral-300 text-xs font-bold px-3 py-2 rounded-lg transition-colors bg-white text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {!submittedAnswers ? (
                    <button
                      onClick={handleGradeQuiz}
                      className="px-4 py-2 border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                    >
                      Submit Exam Key
                    </button>
                  ) : (
                    <button
                      onClick={handleFinishQuiz}
                      className="px-5 py-2 border border-emerald-700 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors shadow-md"
                    >
                      Finish & Record Stats
                    </button>
                  )}
                </div>
              </div>
            )}
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
              <h3 className="font-bold text-neutral-800 text-sm">Study Assessment Notice</h3>
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

      {/* Custom Confirm Quit Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <span className="text-xl">🚪</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-neutral-800 text-sm">Quit Practice Quiz?</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Are you sure you want to quit this practice session? Your current progress and unsaved stats will be lost.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Continue Practice
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  setActiveQuiz(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Quit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
