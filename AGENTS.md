# Portfolio maintenance instructions

- The portfolio supports Korean (`ko`), English (`en`), and Japanese (`ja`).
- Whenever a page, section, project, study, freelance item, caption, button, metadata, or other visible copy is added or changed, keep it available in all three languages.
- New pages must include `scripts/locales.js` and then `scripts/i18n.js` after their content-rendering scripts.
- After changing visible Korean copy, run `python scripts/generate-locales.py`, then review the generated English and Japanese wording before publishing.
- Keep the language selector (`KO`, `EN`, `JP`) available in the site header and verify that the selected language persists when navigating between pages.
- Korean is the source language. Write clear Korean source copy so the English and Japanese translations remain accurate, and do not add text that is excluded from translation unless it is a proper noun or technical identifier.
