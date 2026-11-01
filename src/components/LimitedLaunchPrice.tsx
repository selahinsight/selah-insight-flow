type LimitedLaunchPriceProps = {
  current: string;
  original: string;
  currentLabel?: string;
  originalLabel?: string;
  className?: string;
};

export function LimitedLaunchPrice({
  current,
  original,
  currentLabel = "런칭가",
  originalLabel = "정가",
  className = "",
}: LimitedLaunchPriceProps) {
  return (
    <div className={`money-limited-price ${className}`.trim()}>
      <div className="money-limited-price-row">
        <strong>{currentLabel} {current}</strong>
        <s>{originalLabel} {original}</s>
      </div>
      <p>2026.12.31까지 한정</p>
    </div>
  );
}
