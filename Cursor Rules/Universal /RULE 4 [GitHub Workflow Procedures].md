# Rule Set 4: GitHub Workflow Procedures

## Branch and Commit Management

### Branch Creation
- When making new features, check out from main to a new branch
- Don't create new branches unless explicitly requested
- Use descriptive branch names related to the feature

### Commits
- Make incremental commits with clear messages
- For large features, create a temporary `todo.md` file
- Never leave unstaged/untracked files after committing
- Group related changes in the same commit

### Environment Files
- Never commit `.env` files to version control
- Never overwrite `.env` files without confirming first
- Use `.env.example` files to document required environment variables

## Pull Request Process

### PR Creation
1. Start a PR using the GitHub CLI:
   ```
   gh pr create
   ```

2. Include in PR description:
   - "This PR was written by @Cursor"
   - Add default reviewers with:
     ```
     gh pr edit <id> --add-reviewer jxnl,ivanleomk
     ```
     Or: include `-r jxnl,ivanleomk` when creating the PR

### PR Labeling
Add appropriate labels based on content:
- `documentation`: For documentation updates
- `feature`: For new features or enhancements
- `client`: For client-related changes
- `types`: For type system changes

Use: 
```
gh pr edit <id> --add-label label1,label2
``` 
Or include `-l label1,label2` when creating

### PR Management
- View PR comments:
  ```
  gh pr view <id> --comments | cat
  ```
- Check PR status:
  ```
  gh pr status
  ```
- List changed files:
  ```
  git diff --name-status main
  ```

## PR Update Strategy

### Stacked PR Pattern
For PR updates:
- Do not directly commit to an existing PR branch
- Instead, create a new PR that builds on top of the original PR's branch
- This creates a "stacked PR" pattern:
  1. Original PR (base) contains initial changes
  2. New PR (stack) contains only review-related updates
  3. Once base PR is merged, the stack can be rebased onto main

### When Making Changes
Before making changes to an existing PR:
1. Check the current branch:
   ```
   git branch
   ```
2. Check what changes have been made:
   ```
   git log main..[current branch]
   ```
3. Follow the stacked PR pattern for updates

### After Changes
After making changes:
1. Check status:
   ```
   git status
   ```
2. Add changes:
   ```
   git add .
   ```
3. Commit changes:
   ```
   git commit -m "descriptive message"
   ```
4. Push changes:
   ```
   git push
   ```
