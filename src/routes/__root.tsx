import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

import appCss from "../styles.css?url";

export const RootComponent: React.FC = () => {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <AppShell />
        <Scripts />
      </body>
    </html>
  );
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Visualizer",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootComponent,
});
