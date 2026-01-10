import { Mic, MicOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Props = {
  setHelpInputQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowAISuggestions: React.Dispatch<React.SetStateAction<boolean>>;
};

export function RecordSpeech({
  setHelpInputQuery,
  setShowAISuggestions,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening until manually stopped
    recognition.lang = "nl-NL";
    recognition.interimResults = true; // Show results as user speaks

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      console.log("Transcript:", finalTranscript);
      setHelpInputQuery(finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      // Only update state if we didn't manually stop
      // This prevents auto-restart behavior
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const handleRecordSpeech = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setHelpInputQuery("");
      setShowAISuggestions(false);
      setIsRecording(true);
    }
  };

  const handleStopRecordSpeech = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="record-speech-button-container">
      {isRecording ? (
        <button
          className="record-speech-button recording"
          aria-label="Stop met opnemen"
          onClick={handleStopRecordSpeech}
        >
          <MicOff size={24} />
          <span>Stop</span>
        </button>
      ) : (
        <button
          className="record-speech-button"
          aria-label="Gebruik je microfoon om je zoekopdracht te spreken"
          onClick={handleRecordSpeech}
        >
          <Mic size={24} />
          <span>Start</span>
        </button>
      )}
    </div>
  );
}
