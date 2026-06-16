// Shown to signed-in members whose membership is still PENDING approval. They
// can browse, but member write-actions are locked until an admin verifies them.
export function PendingBanner() {
  return (
    <div className="relative z-40 border-b-2 border-[#22c55e]/40 bg-[#22c55e]/10 px-6 py-3 text-center">
      <span className="retro text-[10px] leading-relaxed text-[#22c55e]">
        MEMBERSHIP PENDING APPROVAL — SOME ACTIONS ARE LOCKED UNTIL AN ADMIN VERIFIES YOU.
      </span>
    </div>
  );
}
