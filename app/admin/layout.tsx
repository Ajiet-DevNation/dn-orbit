export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full bg-zinc-900 border-r border-zinc-800 p-6 md:w-64">
        <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
        <nav className="flex flex-col gap-3 text-zinc-400">
          <a href="/admin" className="hover:text-white">Dashboard</a>
          <a href="/admin/members" className="hover:text-white">Members</a>
          <a href="/admin/events" className="hover:text-white">Events</a>
          <a href="/admin/leaderboard" className="hover:text-white">Leaderboard</a>
        </nav>
      </aside>

      <main className="flex-1 p-8 bg-black text-white">
        {children}
      </main>
    </div>
  );
}
