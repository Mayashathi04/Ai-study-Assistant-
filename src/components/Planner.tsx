import React, { useState } from "react";
import { StudyPlan, ScheduleItem } from "../types";
import { Calendar, Sparkles, Plus, ListChecks, CheckCircle2, Circle, Clock, ArrowRight, Loader2, Trash2 } from "lucide-react";

interface PlannerProps {
  savedPlans: StudyPlan[];
  onSavePlans: (plans: StudyPlan[]) => void;
  onUpdateLogs: (type: "summary" | "chat" | "quiz" | "flashcard" | "schedule", title: string, detail: string) => void;
}

export default function Planner({ savedPlans, onSavePlans, onUpdateLogs }: PlannerProps) {
  // Input builders for plan creation
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [studyHours, setStudyHours] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Active plan viewer
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);

  // Add subject tag helper
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectInput.trim()) return;
    if (!subjectsList.includes(subjectInput.trim())) {
      setSubjectsList([...subjectsList, subjectInput.trim()]);
    }
    setSubjectInput("");
  };

  const handleRemoveSubject = (tag: string) => {
    setSubjectsList(subjectsList.filter((s) => s !== tag));
  };

  // Generate Plan action triggers API
  const handleGeneratePlan = async () => {
    if (!examName.trim()) {
      setAlertMessage("Please enter your target Exam Name (e.g., final Term Biology Exam).");
      return;
    }
    if (subjectsList.length === 0) {
      setAlertMessage("Please add at least one subject topic tags to study.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-study-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: examName.trim(),
          examDate: examDate || "Flexible Timeline",
          subjects: subjectsList,
          studyHoursPerDay: studyHours,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to contact professional advisor scheduling service.");
      }

      const result = await response.json();
      
      // Build final Study Plan object
      const formattedSchedule: ScheduleItem[] = result.schedule.map((item: any, idx: number) => ({
        id: `sc_item_${Date.now()}_${idx}`,
        dayNumber: item.dayNumber,
        date: item.date || `Day ${item.dayNumber}`,
        topic: item.topic,
        suggestedDuration: item.suggestedDuration || `${studyHours} hours`,
        tasksList: item.tasksList || ["Review key facts", "Make index flashcards"],
        completed: false,
      }));

      const newPlan: StudyPlan = {
        id: `plan_${Date.now()}`,
        examName: examName.trim(),
        examDate: examDate || "Flexible Timeframe",
        subjects: subjectsList,
        studyHours,
        weeksRemaining: 1, // default block scale config
        dailySchedule: formattedSchedule,
        createdAt: new Date().toLocaleDateString(),
      };

      const updatedPlans = [newPlan, ...savedPlans];
      onSavePlans(updatedPlans);
      setActivePlan(newPlan);

      // Reset form controls
      setExamName("");
      setExamDate("");
      setSubjectsList([]);

      onUpdateLogs("schedule", newPlan.examName, `Created smart 7-day revision timeline table.`);

    } catch (err: any) {
      console.error(err);
      setAlertMessage(`Strategy Timeline Generation failed: ${err.message || "Unknown error."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Checkbox triggers to toggle tasks and milestone days completed
  const handleToggleDayComplete = (dayId: string) => {
    if (!activePlan) return;

    const updatedSchedule = activePlan.dailySchedule.map((item) => {
      if (item.id === dayId) {
        const nextState = !item.completed;
        if (nextState) {
          onUpdateLogs("schedule", activePlan.examName, `Completed milestone day focused on: "${item.topic}". Keep pushing!`);
        }
        return { ...item, completed: nextState };
      }
      return item;
    });

    const updatedPlan = { ...activePlan, dailySchedule: updatedSchedule };
    setActivePlan(updatedPlan);

    const updatedList = savedPlans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    onSavePlans(updatedList);
  };

  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this study schedule timetable?")) {
      const filtered = savedPlans.filter((p) => p.id !== id);
      onSavePlans(filtered);
      if (activePlan?.id === id) {
        setActivePlan(null);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" id="planner_section">
      {/* Sidebar - Creator settings & past timelines */}
      {!activePlan && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
            <h2 className="text-sm font-bold text-neutral-800 tracking-wider uppercase border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              📅 Timetable Settings
            </h2>

            {/* Exam Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block">Examination Name</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g., UPSC Prelims, SAT Physics, C Final"
                className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 placeholder-neutral-400 outline-none focus:border-sky-500 transition-all font-medium text-neutral-800"
              />
            </div>

            {/* Target Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block font-bold">Target Date (Optional)</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-sky-500 font-semibold text-neutral-700"
              />
            </div>

            {/* Hours Daily budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block">Daily Study Allocation</label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={studyHours}
                  onChange={(e) => setStudyHours(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-1 rounded w-16 text-center">
                  {studyHours} Hrs
                </span>
              </div>
            </div>

            {/* Topics/subjects tag inputs */}
            <form onSubmit={handleAddSubject} className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block">Topics / Subject Chapters</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="e.g. Trigonometry, Arrays, Cell biology"
                  className="flex-1 text-xs border border-neutral-200 rounded-xl px-3 py-2 placeholder-neutral-400 outline-none focus:border-sky-500 font-medium text-neutral-800"
                />
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs p-2.5 rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Display tags list */}
              {subjectsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subjectsList.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => handleRemoveSubject(tag)}
                      className="inline-flex items-center gap-1 bg-neutral-100 hover:bg-red-50 hover:text-red-600 text-[10px] font-bold text-neutral-700 px-2.5 py-1 rounded-lg border border-neutral-200 cursor-pointer transition-colors"
                      title="Click tag to remove"
                    >
                      {tag} &times;
                    </span>
                  ))}
                </div>
              )}
            </form>

            <div className="pt-2">
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 transition-colors text-sm disabled:bg-neutral-200 shadow-sm"
                id="generate_schedule_submit_btn"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Framing Schedule...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" /> Construct 7-day Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main planner board output area */}
      <div className={`${activePlan ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
        {!activePlan ? (
          /* PREVIOUS PLANS TIMETABLE ARCHIVES */
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-800 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-500" /> Study Schedulers
            </h2>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
              {savedPlans.length === 0 ? (
                <div className="text-center py-20 text-neutral-400 space-y-3 my-auto">
                  <Calendar className="w-12 h-12 mx-auto stroke-1 text-neutral-300" />
                  <h3 className="font-bold text-neutral-700 text-sm">No timetables generated yet.</h3>
                  <p className="text-xs text-neutral-400 px-6 max-w-sm mx-auto">
                    Formulate your target exam date on the left and input subjects to generate a structured study timeline index.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedPlans.map((plan) => {
                    const completedDays = plan.dailySchedule.filter((d) => d.completed).length;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setActivePlan(plan)}
                        className="border border-neutral-200 hover:border-sky-400 hover:shadow-sm transition-all p-5 rounded-2xl bg-white flex flex-col justify-between h-44 cursor-pointer"
                        id={`plan_box_${plan.id}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between">
                            <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-100 font-bold px-2.5 py-0.5 rounded uppercase">
                              7-Day Milestone
                            </span>
                            <button
                              onClick={(e) => handleDeletePlan(plan.id, e)}
                              className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-neutral-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <h3 className="font-bold text-neutral-800 text-xs line-clamp-1 pt-1">{plan.examName}</h3>
                          <p className="text-[10px] text-neutral-500 font-medium">Subjects: {plan.subjects.join(", ")}</p>
                        </div>

                        <div className="pt-2 border-t border-neutral-50 flex items-center justify-between text-xs font-semibold">
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-neutral-400">Completion stats</p>
                            <p className="text-neutral-800 font-bold">{completedDays} / 7 days done</p>
                          </div>
                          <button className="text-sky-500 font-bold text-xs inline-flex items-center gap-1">
                            Timeline <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE TIMETABLE LAYOUT FLOW */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Target: {activePlan.examName}
                </span>
                <h2 className="text-lg font-bold text-neutral-800 tracking-tight mt-1 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-500" /> Exam Study Guide Schedule
                </h2>
                <p className="text-[10px] text-neutral-400">Exam timelinecontext: {activePlan.examDate} &bull; Allocation: {activePlan.studyHours} hours base daily</p>
              </div>
              <button
                onClick={() => setActivePlan(null)}
                className="text-xs text-neutral-400 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 rounded-xl px-3 py-1.5 font-semibold transition-colors"
                id="quit_plan_btn"
              >
                Exit Plan
              </button>
            </div>

            {/* Timetable milestones completed stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-neutral-100 bg-neutral-50/50 p-4 rounded-xl text-xs font-semibold">
              <div className="space-y-0.5">
                <p className="text-[10px] text-neutral-400">Subjects to grasp</p>
                <p className="text-neutral-800 font-bold line-clamp-1">{activePlan.subjects.join(", ")}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-neutral-400">Daily block budget</p>
                <p className="text-neutral-800 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" /> {activePlan.studyHours} hours suggested
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-neutral-400">Preparation status</p>
                <p className="text-sky-600 font-bold">
                  {activePlan.dailySchedule.filter((d) => d.completed).length} / 7 Milestones Completed
                </p>
              </div>
            </div>

            {/* 7-day milestones timeline container */}
            <div className="space-y-4">
              <h3 className="block text-xs font-bold text-neutral-500 uppercase tracking-wider text-left">
                📦 7-Day Strategy Timeline checklist
              </h3>
              <div className="space-y-3">
                {activePlan.dailySchedule.map((day) => (
                  <div
                    key={day.id}
                    className={`border rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      day.completed
                        ? "bg-slate-50/70 border-neutral-200 opacity-70"
                        : "bg-white border-sky-100 hover:border-sky-300 shadow-sm"
                    }`}
                    id={`milestone_day_${day.dayNumber}`}
                  >
                    <div className="flex gap-4 items-start min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleDayComplete(day.id)}
                        className={`mt-0.5 p-1 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          day.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-neutral-300 hover:border-sky-400 text-transparent"
                        }`}
                        title="Mark day completed"
                        id={`milestone_check_${day.dayNumber}`}
                      >
                        {day.completed ? (
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-300 hover:text-sky-400" />
                        )}
                      </button>

                      {/* Day description */}
                      <div className="min-w-0 space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-neutral-800 text-xs uppercase tracking-wide">
                            Day {day.dayNumber} Focus
                          </span>
                          <span className="text-[10px] text-neutral-400 italic">({day.date})</span>
                          <span className="text-[9px] bg-sky-50 text-sky-600 border border-sky-100 font-bold px-1.5 py-0.2 rounded-full">
                            {day.suggestedDuration}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-neutral-800 text-sm">{day.topic}</h4>
                        
                        {/* Daily tasks checklists */}
                        <div className="pt-2 pl-1 space-y-1">
                          {day.tasksList.map((task, tkIdx) => (
                            <p key={tkIdx} className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-medium">
                              <span className="text-sky-400 font-extrabold">&bull;</span> {task}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
              <h3 className="font-bold text-neutral-800 text-sm">Study Planner Workspace</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{alertMessage}</p>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
            >
              Okay, Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
