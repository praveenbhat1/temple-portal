/**
 * Loading state for the admin portal.
 *
 * A skeleton rather than a spinner: the dashboard's shape is fixed, so showing
 * that shape while the data arrives makes the wait feel like the page filling
 * in rather than the page being absent.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200/70 space-y-4">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="skeleton h-7 w-20" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 p-6 space-y-4">
          <div className="skeleton h-5 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className="skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/3" />
                <div className="skeleton h-3 w-1/4" />
              </div>
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/70 p-6 space-y-4">
          <div className="skeleton h-5 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 py-1.5">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-3.5 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
