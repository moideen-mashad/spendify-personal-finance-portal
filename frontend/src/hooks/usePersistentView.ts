import { useState } from "react";

export type LayoutView = "grid" | "table";

function readView(key: string, defaultView: LayoutView): LayoutView {
  if (typeof window === "undefined") return defaultView;

  const savedView = window.localStorage.getItem(key);
  return savedView === "grid" || savedView === "table"
    ? savedView
    : defaultView;
}

export function usePersistentView(
  key: string,
  defaultView: LayoutView,
): [LayoutView, (view: LayoutView) => void] {
  const [view, setView] = useState(() => readView(key, defaultView));

  function updateView(nextView: LayoutView) {
    window.localStorage.setItem(key, nextView);
    setView(nextView);
  }

  return [view, updateView];
}
