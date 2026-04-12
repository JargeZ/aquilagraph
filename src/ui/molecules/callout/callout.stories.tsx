import type { Meta, StoryObj } from "@storybook/react";

import { Callout } from "./callout";

const meta = {
  title: "UI/Molecules/Callout",
  component: Callout,
  tags: ["autodocs"],
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: "💡",
    title: "Подсказка",
    children:
      "Краткий поясняющий текст в callout. Используйте семантические цвета темы.",
  },
};
