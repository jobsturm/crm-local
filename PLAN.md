## Simple CRM

I want to build a system (CRM) that handles the following things for my clients:

- An address book of customers
- A way to generate Invoices
- A way to customize their business info
- A settings screen

Technically:

Separation of UI and Backend
- I want two apps to run, they should be bundled together so the user does not have to start two apps

Tech Stack (Frontend): 
- This has to run local in Electron.
- Vue 3
- Vite
- TypeScript in Strict mode
- Naive UI : https://www.naiveui.com/en-US/os-theme/components/layout
- Unit tested with Vite

Tech Stack (backend):
- NodeJS Server
- TypeScript
- DTOs should be shared between Frontend and Backend.
- Unit tested with Vite

The storage (database) for this should happen in JSON 
- This JSON should always start with "version" which is semver
- This way we can change the JSON format and be backwards compatible
- The user should be able to decide where to store this JSON in the settings screen

A few notes of concern
- When I ask LLMs to write Apps like this they usually FreeStyle with the Styling. I DON'T WANT THAT.
- For layout use: https://www.naiveui.com/en-US/os-theme/components/layout
- https://www.naiveui.com/en-US/os-theme/components/flex
- https://www.naiveui.com/en-US/os-theme/components/grid
- https://www.naiveui.com/en-US/os-theme/components/space
- Don't write any custom CSS and Components if you don't have to. We stay as close to Naive UI as possible.




