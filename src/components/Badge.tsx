const confidenceToClass = (confidence: number) => {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
};

const confidenceToText = (confidence: number) => {
  if (confidence >= 0.9) return "BESTE MATCH";
  if (confidence >= 0.7) return "GOEDE MATCH";
  return "MOGELIJKE MATCH";
};

export function Badge({ confidence }: { confidence: number }) {
  return (
    <div className={`badge ${confidenceToClass(confidence)}`}>
      {confidenceToText(confidence)}
    </div>
  );
}
