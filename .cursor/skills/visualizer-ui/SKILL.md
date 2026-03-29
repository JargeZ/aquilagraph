---
name: visualizer-ui
description: >-
  Правила UI для проекта visualizer: shadcn/Radix в src/ui, алиас @ui/, атомарный
  дизайн, семантические цвета Tailwind и Storybook с autodocs. Читай при работе с
  компонентами, темой или сторис.
---

# Visualizer: UI и компоненты

## Расположение и алиасы

- Все переиспользуемые UI-компоненты живут в **`src/ui`**.
- В TypeScript/Vite используй алиас **`@ui/...`** (см. `tsconfig.json`: `@ui/*` → `./src/ui/*`).
- Внутри `ui` обязательны каталоги **`atoms/`**, **`molecules/`**, **`organisms/`**. Пустые уровни допускаются (например, только `.gitkeep`), новые примитивы клади в логичный слой.

## Структура одного компонента

- Каждый компонент — **отдельная папка** с именем в нижнем регистре.
- Минимум два файла: **`имя.tsx`** (реализация) и **`имя.stories.tsx`** (Storybook).
- Пример: `@ui/molecules/button/button.tsx`, `@ui/molecules/button/button.stories.tsx`.

## Стили и тема

- Верстка только через **семантические классы темы** Tailwind/shadcn: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `bg-card`, `text-destructive`, и т.д.
- Не вводить произвольные hex/rgb для фона и текста без веской причины; расширение темы — через CSS-переменные в `src/styles.css` и `@theme`.

## Storybook

- Сторисы рядом с компонентом, суффикс **`.stories.tsx`**.
- Для autodocs в `meta` указывай **`tags: ["autodocs"]`** (и при необходимости стандартные `title`, `component`, `argTypes`).
- Сборка: `pnpm storybook` / `pnpm build-storybook`; конфиг в `.storybook/` (Vite без плагинов TanStack Start).

## shadcn CLI

- Реестр и пути задаются в **`components.json`** (aliases указывают на `@/ui` и `@/ui/molecules`).
- Новые блоки из реестра добавляй с **`pnpm dlx shadcn@latest add <name> -y -p src/ui/molecules/<name>`** (или в `atoms` / `organisms`), затем дополни **`.stories.tsx`**.
