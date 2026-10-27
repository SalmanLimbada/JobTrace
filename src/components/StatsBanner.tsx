interface StatsBannerProps {
  total: number;
  interviews: number;
  offers: number;
  rejected: number;
}

export default function StatsBanner({
  total,
  interviews,
  offers,
  rejected,
}: StatsBannerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs text-purple-400 font-medium uppercase tracking-wider">Total Applied</p>
        <p className="text-xl sm:text-2xl font-bold text-purple-400 mt-0.5 sm:mt-1">{total}</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs text-blue-400 font-medium uppercase tracking-wider">Interviewing</p>
        <p className="text-xl sm:text-2xl font-bold text-blue-400 mt-0.5 sm:mt-1">{interviews}</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs text-emerald-400 font-medium uppercase tracking-wider">Offers</p>
        <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5 sm:mt-1">{offers}</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs text-red-400 font-medium uppercase tracking-wider">Rejected</p>
        <p className="text-xl sm:text-2xl font-bold text-red-400 mt-0.5 sm:mt-1">{rejected}</p>
      </div>
    </div>
  );
}
