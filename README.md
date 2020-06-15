# `main-branch`

A tool to replace the main branch for your repository on GitHub safely. Features:

- Individual commands for creating/deleting/setting branches as default on GitHub, as well as a command that does "everything" (`replace`).
- Checking for any open PRs against the existing default branch.

Not supported yet:

- Renaming your branches locally in a git repository.
- Checking/transferring branch protections in GitHub
- Generating instructions for developers using your repo.

# Usage

Install:

    npm install -g main-branch

Get info about a repo:

    main-branch info owner/repo

Replace `master` with `main`:

    main-branch replace owner/repo

More commands (info, set, create, delete, replace):

    main-branch help

## Notes

- For convenience, you can also call `main` instead of `main-branch`.
- You can use the repo URL instead of `owner/repo` format.

See [example.md](./example.md) for example output.
