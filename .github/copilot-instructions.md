# GitHub Copilot Instructions

## Code Comments
- **NO point-in-time comments** (e.g., "Added this on 2024-01-01", "Fixed bug #123")
- **Block comment at file top**: Summarize file purpose and responsibilities
- **Section comments**: Single line above sections to explain what they do
- **Remove outdated comments** when encountered during edits
- Keep comments concise and focused on *why*, not *what*

## Documentation
- **Never create documentation** unless explicitly requested
- No README updates, no markdown files, no summary documents
- If asked to "document changes", confirm with user first

## Planning & Context
- **Always check for `plan.md`** in the workspace before starting work
- If `plan.md` exists:
  - Read it to understand ongoing/planned work
  - Validate if it's still accurate and relevant
  - Update it if requested, never create it spontaneously

## Validation & Testing
- **No assumptions**: Validate everything before implementing
- Always test changes after implementation
- Use existing test infrastructure when available
- Check for errors after file edits

## Best Practices
- Follow established patterns in the codebase
- Use TypeScript strict mode conventions
- Prefer functional patterns over imperative when appropriate
- Keep functions small and focused
- Handle errors explicitly, never silently fail
- Use proper types, avoid `any` unless absolutely necessary

## Tech Stack Specific
### TypeScript/Next.js
- Use modern ES6+ syntax
- Prefer async/await over promises
- Use proper Next.js conventions (app router, server components)

### Firebase
- Handle quota limits and rate limiting
- Use proper error handling for Firebase operations
- Follow security rules patterns

### Swift/iOS
- Follow Swift naming conventions
- Use modern Swift concurrency (async/await)
- Leverage SwiftUI best practices
