/// <reference types="vite/client" />
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import Header from "~/components/Header";
import BottomNav from "~/components/BottomNav";
import appCss from "~/styles/app.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var m=(s==='light'||s==='dark'||s==='auto')?s:'auto';var d=matchMedia('(prefers-color-scheme:dark)').matches;var r=m==='auto'?(d?'dark':'light'):m;var h=document.documentElement;h.classList.remove('light','dark');h.classList.add(r);if(m==='auto')h.removeAttribute('data-theme');else h.setAttribute('data-theme',m);h.style.colorScheme=r}catch(e){}})()`;

const SW_REGISTER_SCRIPT = `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Tool Library — Highlands2" },
      {
        name: "description",
        content: "Borrow tools from your neighbors in Highlands2.",
      },
      { name: "theme-color", content: "#FDFAF6" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <div className="app-shell">
          <Header />
          <main className="app-main">
            {children}
          </main>
          <BottomNav />
        </div>
        <Scripts />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER_SCRIPT }} />
      </body>
    </html>
  );
}
