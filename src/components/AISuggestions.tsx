import { Stethoscope, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateAISuggestions } from "@/_actions/ai-suggestion";

type Props = {
  onSelectAISuggestion: (suggestion: string) => void;
};

export function AISuggestions({ onSelectAISuggestion }: Props) {
  const getAISuggestionsFn = useServerFn(generateAISuggestions);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [helpInputQuery, setHelpInputQuery] = useState("");

  const selectAISuggestion = (suggestion: string) => {
    onSelectAISuggestion(suggestion);
    setShowAISuggestions(false);
    setAiSuggestions([]);
    setHelpInputQuery(""); // Clear the help input
  };

  const getAISuggestions = async () => {
    if (!helpInputQuery.trim()) return;

    setIsLoadingAI(true);
    setShowAISuggestions(true);

    try {
      const { data, error } = await getAISuggestionsFn({
        data: { query: helpInputQuery },
      });
      if (error) {
        console.error(error);
        setAiSuggestions([]);
      } else {
        setAiSuggestions(data || []);
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
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
        <button
          type="button"
          className="help-button"
          onClick={getAISuggestions}
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
            <div
              key={`${suggestion}-${index}`}
              className="ai-suggestion-item"
              onClick={() => selectAISuggestion(suggestion)}
            >
              <Stethoscope className="suggestion-icon" size={18} />
              <span className="suggestion-text">{suggestion}</span>
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
