import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import playwright from 'eslint-plugin-playwright'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['e2e/**/*.{ts,tsx}'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expect',
            'expectToast',
            'expectProjectInList',
            'expectDetailPanelContent',
            'expectToolSetSelected',
            'expectToolSetInList',
            'expectRuleSelected',
            'expectMcpSetSelected',
            'expectIndividualToolChecked',
            'expectToolSetExpanded',
            'expectEditorContent',
            'expectRuleInList',
            'expectToolInList',
            'expectToolIsCustom',
            'expectToolIsInstalled',
            'expectDropdownMenuItem',
            'expectSetInList',
            'expectMcpInSet',
            'expectMcpDefInLibrary',
            'expectTypeButtonSelected',
            'expectFieldsVisibility',
          ],
        },
      ],
    },
  },
])
