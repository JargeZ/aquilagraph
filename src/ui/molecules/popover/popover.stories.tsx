import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@ui/molecules/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "UI/Popover",
  component: Popover,
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Открыть
        </Button>
      </PopoverTrigger>
      <PopoverContent>Содержимое</PopoverContent>
    </Popover>
  ),
};
