import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

// iOS Safari keyboard fix: reset scroll when inputs lose focus
document.addEventListener("focusout", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    setTimeout(() => {
      const el = (e.target as HTMLElement).closest("[data-scroll-anchor]");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }
});

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  // En GitHub Pages la app vive en /convertidor-ticket-webview/ (ver vite.config.static.ts)
  basepath: import.meta.env.BASE_URL,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
