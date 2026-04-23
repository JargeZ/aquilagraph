import type { Meta, StoryObj } from "@storybook/react";
import { ModuleRootsPicker } from "./module-roots-picker";
import { useState } from "react";

const meta: Meta<typeof ModuleRootsPicker> = {
  title: "ui/organisms/module-roots-picker",
  component: ModuleRootsPicker,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ModuleRootsPicker>;

export const Default: Story = {
  render: () => {
    const [moduleDepth, setModuleDepth] = useState(2);
    const [moduleRoots, setModuleRoots] = useState<string[]>([
      "src.components.ui.molecules",
      "src.components.feature-1",
    ]);
    return (
      <div className="max-w-2xl p-6">
        <ModuleRootsPicker
          moduleDepth={moduleDepth}
          moduleRoots={moduleRoots}
          sourceFiles={[
            "src/components/ui/atoms/a.ts",
            "src/components/ui/molecules/b.ts",
            "src/components/ui/lib1/c.ts",
            "src/components/ui/lib2/d.ts",
            "src/components/ui/organisms/e.ts",
            "src/components/feature-1/x.ts",
            "src/components/feature-2/y.ts",
            "src/components/feature-3/z.ts",
          ]}
          onModuleDepthChange={setModuleDepth}
          onModuleRootsChange={setModuleRoots}
        />
      </div>
    );
  },
};

