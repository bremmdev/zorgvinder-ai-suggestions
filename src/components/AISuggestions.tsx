import {
  Stethoscope,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateAISuggestions } from "@/_actions/ai-suggestion";
import { AISuggestion } from "@/types";
import { Badge } from "./Badge";
import { RecordSpeech } from "./RecordSpeech";
import { ClientOnly } from "@tanstack/react-router";

type Props = {
  onSelectAISuggestion: (suggestion: string) => void;
};

export function AISuggestions({ onSelectAISuggestion }: Props) {
  const getAISuggestionsFn = useServerFn(generateAISuggestions);

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [helpInputQuery, setHelpInputQuery] = useState("");
  const [toolTipIndex, setToolTipIndex] = useState<number | null>(null);

  const selectAISuggestion = (
    e: React.MouseEvent<HTMLDivElement>,
    suggestion: string
  ) => {
    e.stopPropagation();
    onSelectAISuggestion(suggestion);
    setShowAISuggestions(false);
    setAiSuggestions([]);
    setHelpInputQuery("");
  };

  const getAISuggestions = async (query?: string) => {
    const queryToUse = query || helpInputQuery;

    if (!queryToUse.trim()) return;

    setIsLoadingAI(true);
    setToolTipIndex(null);
    setHelpInputQuery(queryToUse);
    setShowAISuggestions(false);
    setAiSuggestions([]);

    try {
      const { data, error } = await getAISuggestionsFn({
        data: { query: queryToUse },
      });
      if (error) {
        console.error(error);
        setAiSuggestions([]);
      } else {
        setAiSuggestions(data || []);
        setShowAISuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleExpandExplanation = (index: number) => {
    if (toolTipIndex === index) {
      setToolTipIndex(null);
    } else {
      setToolTipIndex(index);
    }
  };

  const onAfterRecord = (transcript: string) => {
    setHelpInputQuery(transcript);
    getAISuggestions(transcript);
  };

  const onRecordStart = () => {
    setHelpInputQuery("");
    setShowAISuggestions(false);
    setAiSuggestions([]);
  };

  const shouldShowAISuggestions = showAISuggestions && aiSuggestions.length > 0;
  const shouldShowZeroResults =
    !isLoadingAI && showAISuggestions && aiSuggestions.length === 0;

  return (
    <div className="help-section">
      <h2>Hulp nodig?</h2>
      <p>
        Laat ons je helpen met je zoekopdracht. Vul in wat je zoekt of wat je
        nodig hebt.
      </p>
      <div className="help-input-wrapper">
        <div className="help-input-container">
          <input
            type="text"
            className="help-input"
            placeholder="Bijv. gebroken tand, rugpijn..."
            value={helpInputQuery}
            onChange={(e) => {
              setHelpInputQuery(e.target.value);
              if (showAISuggestions) {
                setShowAISuggestions(false);
                setAiSuggestions([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                getAISuggestions();
              }
            }}
            autoComplete="off"
          />

          <ClientOnly>
            <RecordSpeech
              onAfterRecord={onAfterRecord}
              onRecordStart={onRecordStart}
            />
          </ClientOnly>
        </div>
        <button
          type="button"
          className="help-button"
          onClick={() => getAISuggestions()}
          disabled={isLoadingAI || !helpInputQuery.trim()}
        >
          {isLoadingAI ? (
            <>
              <Loader2 size={18} />
              <span>Zoeken...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Krijg aanbevelingen</span>
            </>
          )}
        </button>
      </div>
      {shouldShowAISuggestions && (
        <div className="ai-suggestions-dropdown help-suggestions">
          <div className="ai-suggestions-header">
            <Sparkles size={16} />
            <span>AI-aanbevelingen</span>
          </div>
          {aiSuggestions.map((suggestion, index) => (
            <div key={`${suggestion}-${index}`} className="ai-suggestion-row">
              <div
                className="ai-suggestion-item"
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  selectAISuggestion(e, suggestion.suggestion)
                }
              >
                <span className="ai-suggestion-item-content">
                  <Stethoscope className="suggestion-icon" size={18} />
                  {suggestion.suggestion}
                  <Badge confidence={suggestion.confidence} />
                </span>
                {suggestion.explanation && toolTipIndex === index && (
                  <span className="suggestion-explanation">
                    {suggestion.explanation}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="ai-suggestion-icon-button"
                onClick={() => handleExpandExplanation(index)}
              >
                {toolTipIndex === index ? (
                  <ChevronUp className="suggestion-icon" size={18} />
                ) : (
                  <ChevronDown className="suggestion-icon" size={18} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
      {shouldShowZeroResults && (
        <div className="ai-suggestions-dropdown help-suggestions">
          <div className="ai-suggestions-header">
            <Sparkles size={16} />
            <span>Geen aanbevelingen gevonden</span>
          </div>
        </div>
      )}
    </div>
  );
}
