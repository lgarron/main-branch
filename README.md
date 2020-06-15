# `main-branch`

A tool to replace the main branch for your repository on GitHub safely. Features:

- Individual commands for creating/deleting/setting branches as default on GitHub, as well as a command that does "everything" (`replace`).
- Checking for any open PRs against the existing default branch.

Not supported yet:

- Renaming your branches locally in a git repository.
- Checking/transferring branch protections in GitHub
- Generating instructions for developers using your repo.

# Usage

Install (currently relies on `node`):

    npm install -g main-branch

Replace `master` with `main`:

    main-branch replace owner/repo

More commands (info, set, create, delete, replace):

    main-branch help

## Online version

<https://garron.net/app/main-branch/>

## Notes

- For convenience, you can also call `main` instead of `main-branch`.
- You can use the repo URL instead of `owner/repo` format.

See [example.md](./example.md) for example output.

## Acknowledgments

Thanks to everyone interested and working to change default branch names!

Thanks to `@PurpleBooth` for [the core API code](https://gist.github.com/PurpleBooth/6983e5c4def4f8721d4a697a3f4606a7).
