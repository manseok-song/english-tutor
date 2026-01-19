# CLAUDE.md - English Tutor Project

This file provides guidance for AI assistants working on this codebase.

## Project Overview

**English Tutor** is an application designed to help users learn and improve their English language skills. This is a new project under active development.

## Repository Status

This repository is in its initial setup phase. The structure and conventions below represent the intended architecture.

## Project Structure (Planned)

```
english-tutor/
├── src/                    # Source code
│   ├── components/         # UI components
│   ├── services/           # Business logic and API services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── index.ts            # Main entry point
├── tests/                  # Test files
├── docs/                   # Documentation
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── CLAUDE.md               # This file
└── README.md               # Project documentation
```

## Development Conventions

### Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations when added
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Add comments for complex logic only

### Naming Conventions

- **Files**: Use kebab-case for file names (`user-profile.ts`)
- **Components**: Use PascalCase (`UserProfile.tsx`)
- **Functions**: Use camelCase (`getUserProfile()`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: Use PascalCase with descriptive names (`UserProfileData`)

### Git Workflow

- Create feature branches from main
- Use descriptive commit messages (imperative mood)
- Keep commits atomic and focused
- Push to designated feature branches

### Commit Message Format

```
<type>: <short description>

<optional body with more details>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Build and Run Commands

Commands will be defined in `package.json`. Expected scripts:

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run linter
npm run format       # Format code
```

## Testing Guidelines

- Write unit tests for utility functions and services
- Write integration tests for API endpoints
- Aim for meaningful test coverage on critical paths
- Test file naming: `*.test.ts` or `*.spec.ts`

## Key Areas for English Tutor

### Core Features (Planned)

1. **Vocabulary Building** - Word lists, flashcards, spaced repetition
2. **Grammar Exercises** - Interactive grammar lessons and quizzes
3. **Reading Comprehension** - Text passages with questions
4. **Writing Practice** - Essay prompts with feedback
5. **Pronunciation** - Audio-based learning (if applicable)
6. **Progress Tracking** - User performance analytics

### Data Considerations

- User progress and learning data should be persisted
- Consider privacy when handling user-generated content
- Support for multiple difficulty levels

## AI Assistant Guidelines

### When Adding Features

1. Check existing code patterns before implementing
2. Follow established conventions in this file
3. Add appropriate tests for new functionality
4. Update documentation when adding significant features
5. Keep backwards compatibility in mind

### When Fixing Bugs

1. Understand the root cause before applying fixes
2. Add regression tests when fixing bugs
3. Avoid over-engineering simple fixes
4. Test edge cases related to the fix

### Code Quality Checklist

- [ ] Code follows project conventions
- [ ] No TypeScript errors
- [ ] Tests pass
- [ ] No console.log statements left in production code
- [ ] Error handling is appropriate
- [ ] Security considerations addressed (input validation, etc.)

## Dependencies (Planned)

Core dependencies will be added as the project develops. Expected categories:

- **Framework**: React, Vue, or similar (TBD)
- **State Management**: Context API, Redux, or Zustand (TBD)
- **Testing**: Jest, Vitest, or similar
- **Build Tools**: Vite, webpack, or similar
- **Styling**: Tailwind CSS, styled-components, or similar (TBD)

## Environment Configuration

Environment variables should be stored in:
- `.env` - Default environment variables
- `.env.local` - Local overrides (not committed)
- `.env.production` - Production settings

Never commit sensitive credentials to the repository.

## Additional Resources

- Project documentation will be added to `/docs`
- API documentation (when applicable)
- Contributing guidelines

---

*This CLAUDE.md will be updated as the project evolves and more concrete patterns emerge.*
