import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/PageHeader";
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
      // Rubik carries chrome, names and numerals (it has real tabular
      // figures); JetBrains Mono is held back for digests only; EB Garamond
      // is the wordmark alone. See theme.css for why each was chosen.
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
        {/* Must run before hydration to avoid a flash of the wrong theme, in
            either axis - see theme.ts's comment. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* Browser extensions may annotate body before React hydrates. The app
          does not own those attributes, so ignore that one-level mismatch. */}
      <body
        className="bg-paper font-sans text-ink antialiased"
        suppressHydrationWarning
      >
        <PageHeader />
        {children}
        <Scripts />
      </body>
    </html>
  );
}
