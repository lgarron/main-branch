# `main-branch`

A tool to replace the main branch for your repository on GitHub safely. Features:

- Individual commands for creating/deleting/setting branches as default on GitHub, as well as a command that does "everything" (`replace`).
- Checks for any open PRs against the existing default branch, and changes the base.
- Checks for any admin branch protections, and won't delete branches that have them..

Not supported yet:

- Renaming your branches locally in a git repository.
- Transferring branch protections between branches.
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

- For convenience, an alias of the `main-branch` binary called `main` is also installed.
- You can use the repo URL instead of `owner/repo` format.

See [example.md](./example.md) for example output.

# Does this solve racism?

No, it just makes our terminology more inclusive.

Consider donating to the [Minnesota Freedom Fund](https://minnesotafreedomfund.org/donate) or another non-profit, pushong for other important changes in your community, or putting your body/privilege on the line for change.

## Acknowledgments

Thanks to everyone interested and working to change default branch names!

Thanks to `@PurpleBooth` for [the original core API code](https://gist.github.com/PurpleBooth/6983e5c4def4f8721d4a697a3f4606a7).
