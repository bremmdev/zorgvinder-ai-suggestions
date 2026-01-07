import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Stethoscope, Building2 } from "lucide-react";
import suggestionsData from "../../data/suggestions.json";
import { AISuggestions } from "./AISuggestions";

type SearchTab = "zorg" | "naam";

export function SearchTabs() {
  const [activeTab, setActiveTab] = useState<SearchTab>("zorg");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCountry, setSelectedCountry] = useState("NL");

  // Filter suggestions based on search query
  const suggestions = suggestionsData as string[];
  const filteredSuggestions =
    searchQuery.length >= 1
      ? suggestions
          .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 8)
      : [];

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionItemsRef.current[highlightedIndex]) {
      suggestionItemsRef.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        return;
      }

      if (!showSuggestions || filteredSuggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0) {
            selectSuggestion(filteredSuggestions[highlightedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [showSuggestions, filteredSuggestions, highlightedIndex]
  );

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  // Highlight matching text in suggestions
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const selectAISuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  };

  return (
    <>
      <div className="search-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "zorg"}
          className={`search-tab ${activeTab === "zorg" ? "active" : ""}`}
          onClick={() => setActiveTab("zorg")}
        >
          Zoek op zorg
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "naam"}
          className={`search-tab ${activeTab === "naam" ? "active" : ""}`}
          onClick={() => setActiveTab("naam")}
        >
          Zoek op naam
        </button>
      </div>
      {activeTab === "zorg" ? (
        <>
          <div className="search-form">
            <div className="search-field">
              <label className="search-label" htmlFor="zorg-search">
                Om welke zorg gaat het?
              </label>
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  ref={searchInputRef}
                  id="zorg-search"
                  type="text"
                  className="search-input"
                  placeholder="Bijv. fysiotherapie, huisarts..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    className="suggestions-dropdown"
                    ref={suggestionsRef}
                    tabIndex={-1}
                  >
                    {filteredSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        ref={(el) => {
                          suggestionItemsRef.current[index] = el;
                        }}
                        className={`suggestion-item ${
                          index === highlightedIndex ? "highlighted" : ""
                        }`}
                        onClick={() => selectSuggestion(suggestion)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        tabIndex={-1}
                      >
                        <Stethoscope className="suggestion-icon" size={18} />
                        <span className="suggestion-text">
                          {highlightMatch(suggestion, searchQuery)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="search-field location-field">
              <label className="search-label" htmlFor="location-search">
                In welke plaats of postcode
              </label>
              <div className="location-input-group">
                <div className="search-input-wrapper">
                  <Building2 className="search-icon" size={20} />
                  <input
                    id="location-search"
                    type="text"
                    className="search-input location-input"
                    placeholder="Bijv. Amsterdam, 1000AA..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <select
                  className="country-dropdown"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value="NL">NL</option>
                  <option value="BE">BE</option>
                  <option value="DE">DE</option>
                </select>
              </div>
            </div>

            <button className="search-button">Zoeken</button>
          </div>
          <AISuggestions onSelectAISuggestion={selectAISuggestion} />
        </>
      ) : (
        <div className="search-form">
          <div className="search-field" style={{ flex: 2 }}>
            <label className="search-label" htmlFor="naam-search">
              Wat is de naam van de zorgverlener?
            </label>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                id="naam-search"
                type="text"
                className="search-input"
                placeholder="Bijv. Huisartsenpraktijk De Brink..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <button className="search-button">Zoeken</button>
        </div>
      )}
    </>
  );
}
