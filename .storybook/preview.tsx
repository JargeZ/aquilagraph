import { type Messages, setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { Preview } from "@storybook/react";

import { messages as enMessages } from "../src/locales/en/messages.po";
import { messages as ruMessages } from "../src/locales/ru/messages.po";
import "../src/styles.css";

const storyI18n = setupI18n();

storyI18n.loadAndActivate({
  locale: "ru",
  messages: {
    ...(enMessages as Messages),
    ...(ruMessages as Messages),
  },
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <I18nProvider i18n={storyI18n}>
        <Story />
      </I18nProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
  },
};

export default preview;
