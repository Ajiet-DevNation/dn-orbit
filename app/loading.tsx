// Route-level Suspense fallback: a plain backdrop in the site colour, nothing
// animated. On "/" the (main) layout's BootSplash owns the logo draw; drawing
// it here as well started a second copy that restarted from 0 once the layout
// streamed in. Elsewhere a full-screen splash only delayed the page.
export default function Loading() {
  return (
    <div className="fixed inset-0 bg-bg" role="status" aria-label="Loading" />
  );
}
