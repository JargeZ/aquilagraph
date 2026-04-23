import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import {
  ModuleFilterOverlay,
  type ModuleFilterItem,
} from "./module-filter-overlay";

const meta: Meta<typeof ModuleFilterOverlay> = {
  title: "ui/organisms/ModuleFilterOverlay",
  component: ModuleFilterOverlay,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ModuleFilterOverlay>;

const ITEMS: ModuleFilterItem[] = [
  { name: "app.core.auth", incomingCount: 3, outgoingCount: 7 },
  { name: "app.core.db", incomingCount: 6, outgoingCount: 2 },
  { name: "app.ui.components", incomingCount: 1, outgoingCount: 4 },
  { name: "app.features.billing", incomingCount: 2, outgoingCount: 5 },
  { name: "app.features.search", incomingCount: 4, outgoingCount: 3 },
  { name: "app.utils", incomingCount: 7, outgoingCount: 1 },
];

function Stateful() {
  const all = useMemo(() => new Set(ITEMS.map((i) => i.name)), []);
  const [selected, setSelected] = useState<Set<string>>(all);
  return (
    <div className="flex min-h-[32rem] items-start justify-end bg-background p-4">
      <ModuleFilterOverlay
        items={ITEMS}
        selected={selected}
        onSelectedChange={setSelected}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <Stateful />,
};

