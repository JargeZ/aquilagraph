import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@ui/molecules/button/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Наведи
        </Button>
      </TooltipTrigger>
      <TooltipContent>Подсказка</TooltipContent>
    </Tooltip>
  ),
};
