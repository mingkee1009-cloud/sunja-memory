<button
  type="button"
  onClick={() => {
    if (!memory?.id) return;
    onToggle(memory.id);
  }}
  className="w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5"
  style={{
    borderColor: memory.isDone ? "#10b981" : "var(--border)",
    background: memory.isDone ? "#10b981" : "transparent",
    cursor: "pointer"
  }}
>
  {memory.isDone && (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="#fff"
      strokeWidth={2}
      className="w-3 h-3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 6l3 3 5-5"
      />
    </svg>
  )}
</button>
export default HomePage;