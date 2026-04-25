import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Genlayer Grant Reviewer" },
      {
        name: "description",
        content:
          "AI-assisted grant reviewer with on-chain verdicts on GenLayer Studio.",
      },
      { property: "og:title", content: "Genlayer Grant Reviewer" },
      {
        property: "og:description",
        content: "AI scores grant proposals; verdicts are written on-chain to GenLayer Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Genlayer Grant Reviewer" },
      { name: "description", content: "The app analyzes submissions for technical quality, innovation, and alignment with ecosystem goals, helping reviewers make faster and more consistent" },
      { property: "og:description", content: "The app analyzes submissions for technical quality, innovation, and alignment with ecosystem goals, helping reviewers make faster and more consistent" },
      { name: "twitter:description", content: "The app analyzes submissions for technical quality, innovation, and alignment with ecosystem goals, helping reviewers make faster and more consistent" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7744668c-324c-4c11-8955-a0b77d1b9226/id-preview-423e2358--60e0dbc5-73ba-4645-a883-522425958044.lovable.app-1777036082664.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7744668c-324c-4c11-8955-a0b77d1b9226/id-preview-423e2358--60e0dbc5-73ba-4645-a883-522425958044.lovable.app-1777036082664.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
