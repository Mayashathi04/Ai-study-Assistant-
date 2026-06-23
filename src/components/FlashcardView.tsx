import React, { useState } from "react";
import { FlashcardSet, Flashcard, NotesMaterial } from "../types";
import { Layers, Sparkles, HelpCircle, Plus, Bookmark, RotateCw, CheckCircle, ArrowLeft, ArrowRight, Trash2, Loader2 } from "lucide-react";

interface FlashcardViewProps {
  savedNotes: NotesMaterial[];
  savedSets: FlashcardSet[];
  onSaveSets: (sets: FlashcardSet[]) => void;
  onUpdateLogs: (type: "summary" | "chat" | "quiz" | "flashcard" | "schedule", title: string, detail: string) => void;
}

export default function FlashcardView({ savedNotes, savedSets, onSaveSets, onUpdateLogs }: FlashcardViewProps) {
  // Generation state
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [manualText, setManualText] = useState("");
  const [cardCount, setCardCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Active review state
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [familiarityStatus, setFamiliarityStatus] = useState<Record<string, 'new' | 'review' | 'known'>>({});

  // Trigger Flashcard Generation
  const handleGenerateCards = async () => {
    let sourceText = "";
    let setTitle = "Key Review Cards";

    if (selectedNoteId) {
      const selectedNote = savedNotes.find((n) => n.id === selectedNoteId);
      if (selectedNote) {
        sourceText = selectedNote.summary || selectedNote.content;
        setTitle = `${selectedNote.title} Flashcards`;
      }
    } else {
      sourceText = manualText.trim();
      setTitle = "Custom Vocabulary Cards";
    }

    if (!sourceText) {
      setAlertMessage("Please select a study note summary context or write custom definitions first.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notesText: sourceText,
          count: cardCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact generative active recall constructor.");
      }

      const result = await response.json();
      if (!result.cards || result.cards.length === 0) {
        throw new Error("No cards could be made. Ensure text notes contain clear sentences or formulas.");
      }

      // Format card sets with default new markers
      const formattedCards: Flashcard[] = result.cards.map((c: any, index: number) => ({
        id: `card_${Date.now()}_${index}`,
        front: c.front,
        back: c.back,
        familiarity: "new",
      }));

      const newSet: FlashcardSet = {
        id: `set_${Date.now()}`,
        title: setTitle,
        materialId: selectedNoteId || undefined,
        cards: formattedCards,
      };

      const updatedSets = [newSet, ...savedSets];
      onSaveSets(updatedSets);
      setActiveSet(newSet);
      setCurrentCardIdx(0);
      setIsFlipped(false);
      setFamiliarityStatus({});

      onUpdateLogs("flashcard", newSet.title, `Generated set of ${formattedCards.length} active recall study flashcards.`);

    } catch (err: any) {
      console.error(err);
      setAlertMessage(`Flashcard generation failed: ${err.message || "Unknown server error."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateFamiliarity = (cardId: string, status: "new" | "review" | "known") => {
    setFamiliarityStatus((p) => ({ ...p, [cardId]: status }));
    
    // Save state on active deck triggers
    if (activeSet) {
      const updatedCards = activeSet.cards.map((c) => {
        if (c.id === cardId) {
          return { ...c, familiarity: status };
        }
        return c;
      });
      const updatedSet = { ...activeSet, cards: updatedCards };
      
      const newDeksList = savedSets.map((s) => (s.id === activeSet.id ? updatedSet : s));
      onSaveSets(newDeksList);
    }

    // Trigger minor streak log counts
    if (status === "known") {
      onUpdateLogs("flashcard", activeSet?.title || "Revision Card", "Marked flashcard definition as fully learned and committed to memory.");
    }
  };

  const handleDeleteSet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this study deck?")) {
      const filtered = savedSets.filter((s) => s.id !== id);
      onSaveSets(filtered);
      if (activeSet?.id === id) {
        setActiveSet(null);
      }
    }
  };

  const handleNextCard = () => {
    if (!activeSet) return;
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIdx < activeSet.cards.length - 1) {
        setCurrentCardIdx((p) => p + 1);
      }
    }, 150);
  };

  const handlePrevCard = () => {
    if (currentCardIdx > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIdx((p) => p - 1);
      }, 150);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" id="flashcardview_section">
      {/* Sidebar - Creator Settings & Past decks */}
      {!activeSet && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
            <h2 className="text-sm font-bold text-neutral-800 tracking-wider uppercase border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              🎓 Flashcard Builder
            </h2>

            {/* Note Selector */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Select Study Document Base</label>
              <select
                value={selectedNoteId}
                onChange={(e) => {
                  setSelectedNoteId(e.target.value);
                  setManualText("");
                }}
                className="w-full text-xs font-semibold border border-neutral-200 rounded-lg p-2.5 bg-white text-neutral-700 outline-none focus:border-pink-500"
              >
                <option value="">Paste Manual Vocabulary Terms Instead</option>
                {savedNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual text builder */}
            {!selectedNoteId && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Custom Terms Box</label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste study lists with headers, formulas, laws, or terms (e.g., 'Newton's first law: An object remains at rest...')"
                  rows={4}
                  className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 placeholder-neutral-400 outline-none focus:border-pink-500 transition-all text-neutral-800 leading-relaxed font-normal"
                />
              </div>
            )}

            {/* Card count select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest block">Number Of Cards</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 8, 12, 16].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setCardCount(cnt)}
                    className={`text-xs font-bold py-2 border rounded-lg transition-all ${
                      cardCount === cnt
                        ? "bg-pink-500 text-white border-pink-500 shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGenerateCards}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 transition-colors text-sm disabled:bg-neutral-200 shadow-sm"
                id="generate_cards_submit_btn"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Making Flashcards...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" /> Build Flashcards Deck
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Flashcard decks view OR Active Card flip Frame */}
      <div className={`${activeSet ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
        {!activeSet ? (
          /* PAST FLASHCARD DECK SELECTOR */
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-800 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-500" /> Active Recall Decks
            </h2>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
              {savedSets.length === 0 ? (
                <div className="text-center py-20 text-neutral-400 space-y-3 my-auto">
                  <Layers className="w-12 h-12 mx-auto stroke-1 text-neutral-300" />
                  <h3 className="font-bold text-neutral-700 text-sm">No flashcard decks built yet.</h3>
                  <p className="text-xs text-neutral-400 px-6 max-w-sm mx-auto">
                    Configure notes or type custom cards parameters in the configuration panel on the left side to compile active recall boards.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedSets.map((set) => (
                    <div
                      key={set.id}
                      onClick={() => {
                        setActiveSet(set);
                        setCurrentCardIdx(0);
                        setIsFlipped(false);
                      }}
                      className="border border-neutral-200 hover:border-pink-400 hover:shadow-sm transition-all p-5 rounded-2xl bg-white flex flex-col justify-between h-40 cursor-pointer"
                      id={`deck_box_${set.id}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] bg-pink-50 text-pink-700 border border-pink-100 font-bold px-2 py-0.5 rounded uppercase">
                            {set.cards.length} Cards
                          </span>
                          <button
                            onClick={(e) => handleDeleteSet(set.id, e)}
                            className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-neutral-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h3 className="font-bold text-neutral-800 text-xs line-clamp-2 pt-1">{set.title}</h3>
                      </div>

                      <div className="text-right text-xs font-semibold text-pink-500 flex items-center justify-end gap-1">
                        <span>Study Deck</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE CARD REVIEW BOARD WITH 3D FLIP */
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] bg-pink-50 text-pink-700 border border-pink-100 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Active Revision
                </span>
                <h2 className="text-lg font-bold text-neutral-800 tracking-tight mt-1">{activeSet.title}</h2>
              </div>
              <button
                onClick={() => setActiveSet(null)}
                className="text-xs text-neutral-400 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 rounded-xl px-3 py-1.5 font-semibold transition-colors"
                id="quit_deck_btn"
              >
                Exit Board
              </button>
            </div>

            {/* Deck statistics */}
            <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold select-none">
              <span>Card {currentCardIdx + 1} of {activeSet.cards.length}</span>
              <span>
                {Math.round(((currentCardIdx + 1) / activeSet.cards.length) * 100)}% Complete
              </span>
            </div>

            {/* Flashcard container with flip style */}
            <div className="flex justify-center py-6">
              {(() => {
                const card = activeSet.cards[currentCardIdx];
                const status = familiarityStatus[card.id] || card.familiarity || "new";

                return (
                  <div className="w-full max-w-lg space-y-6">
                    {/* Interactive Clickable Flip Box */}
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className={`relative w-full h-64 cursor-pointer select-none border-2 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${
                        isFlipped
                          ? "bg-zinc-900 border-zinc-800 text-zinc-100"
                          : "bg-gradient-to-tr from-white to-pink-50/20 border-pink-100 hover:border-pink-200/80 shadow-sm"
                      }`}
                      id="card_flip_box"
                    >
                      {/* Top cue line */}
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
                        <span className={isFlipped ? "text-zinc-500" : "text-pink-500"}>
                          {isFlipped ? "💡 AI Back Solution" : "❓ Card Front Question"}
                        </span>
                        <span className={`px-2 py-0.5 rounded border ${
                          status === "known" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : status === "review" 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {status.toUpperCase()}
                        </span>
                      </div>

                      {/* Mind Content */}
                      <div className="my-auto py-4 text-center">
                        <p className={`text-sm md:text-base font-bold leading-relaxed tracking-tight ${isFlipped ? 'text-zinc-100' : 'text-neutral-800'}`}>
                          {isFlipped ? card.back : card.front}
                        </p>
                      </div>

                      {/* Footer suggestion line */}
                      <div className="text-center text-[10px] text-neutral-400 font-medium">
                        Click card anywhere to {isFlipped ? "reveal question" : "flip definition solution"}
                      </div>
                    </div>

                    {/* Active familiarity evaluation button tools */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider text-center">
                        Self-Grade Familiarity
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleUpdateFamiliarity(card.id, "new")}
                          className={`flex-1 text-xs font-bold py-2 px-3 border rounded-xl transition-all ${
                            status === "new"
                              ? "bg-blue-100 border-blue-400 text-blue-700 shadow-sm"
                              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                          }`}
                        >
                          Hard (New)
                        </button>
                        <button
                          onClick={() => handleUpdateFamiliarity(card.id, "review")}
                          className={`flex-1 text-xs font-bold py-2 px-3 border rounded-xl transition-all ${
                            status === "review"
                              ? "bg-amber-100 border-amber-400 text-amber-700 shadow-sm"
                              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                          }`}
                        >
                          Medium (Unsure)
                        </button>
                        <button
                          onClick={() => handleUpdateFamiliarity(card.id, "known")}
                          className={`flex-1 text-xs font-bold py-2 px-3 border rounded-xl transition-all ${
                            status === "known"
                              ? "bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm"
                              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                          }`}
                        >
                          Learned (Mastery)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Navigation keys */}
            <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
              <button
                onClick={handlePrevCard}
                disabled={currentCardIdx === 0}
                className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-neutral-300 text-xs font-bold px-4 py-2 bg-white text-neutral-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" /> Back Card
              </button>

              <button
                onClick={handleNextCard}
                disabled={currentCardIdx === activeSet.cards.length - 1}
                className="inline-flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-xs font-bold px-4 py-2 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next Card <ArrowRight className="w-4 h-4" />
              </button>
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
              <h3 className="font-bold text-neutral-800 text-sm">Active Recall Deck Alert</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{alertMessage}</p>
            </div>
            <button
              onClick={() => setAlertMessage(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
            >
              Verify & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
