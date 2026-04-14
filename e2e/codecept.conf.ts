import { setHeadlessWhen, setCommonPlugins } from '@codeceptjs/configure';
// turn on headless mode when running with HEADLESS=true environment variable
// export HEADLESS=true && npx codeceptjs run
setHeadlessWhen(process.env.HEADLESS);

// enable all common plugins https://github.com/codeceptjs/configure#setcommonplugins
setCommonPlugins();

export const config: CodeceptJS.MainConfig = {
  tests: './*_test.ts',
  output: './output',
  helpers: {
    Playwright: {
      browser: 'chromium',
      url: 'http://localhost:4141',
      locale: 'en-US',
      show: true
    }
  },
  include: {
    I: './steps_file'
  },
  ai: {
    request: async messages => {
      const OpenAI = require('openai')
      const openai = new OpenAI({apiKey: process.env['OPENAI_API_KEY']})

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
      })

      return completion?.choices[0]?.message?.content
    }
  },
  plugins: {
    htmlReporter: {
      enabled: true
    }
  },
  name: 'e2e'
}