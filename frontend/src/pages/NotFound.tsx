import { Link } from "react-router-dom";
export default () => (
  <main className="grid min-h-[70vh] place-items-center text-center">
    <div>
      <p className="text-7xl font-bold text-slate-200">404</p>
      <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
      <Link
        className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white"
        to="/"
      >
        Go to dashboard
      </Link>
    </div>
  </main>
);
