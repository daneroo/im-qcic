import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { THEME_INIT_SCRIPT } from "../theme";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "im-qcic" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      // PROTOTYPE — see ../prototype/README.md. Rubik carries chrome, names
      // and numerals (it has real tabular figures); JetBrains Mono is held
      // back for digests only.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..700;1,300..500&family=JetBrains+Mono:wght@400;500;700&family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,500&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Must run before hydration to avoid a flash of the wrong theme - see theme.ts's comment. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* PROTOTYPE — the theme family lives in the URL so a variant+theme
            pair is a shareable link; read it before paint for the same reason
            THEME_INIT_SCRIPT exists. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=/[?&]theme=(sketch|chromatic|catppuccin)/.exec(location.search);document.documentElement.dataset.theme=m?m[1]:"sketch";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
