# `main-branch`

A tool to replace the main branch for your repository on GitHub safely and easily.

`main-branch` also guards against removing branches that will affect GitHub features based on the branch. It can also transfer the settings for some of those features to the new branch.

| Branch Feature           | Guards against | Transfers |
| ------------------------ | -------------- | --------- |
| Open PRs based on branch | ✅             | ✅        |
| Branch protections       | ✅             | TODO      |
| GitHub Pages             | ✅             | TODO      |

Not supported yet:

- Renaming your branches locally in a git repository.

# Usage

Install (currently relies on `node`) and replace `master` with `main`:

    npm install -g main-branch
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

Consider donating to the [Minnesota Freedom Fund](https://minnesotafreedomfund.org/donate) or another non-profit, advocating for important changes in your community, or putting your body/privilege on the line for change.

## Acknowledgments

Thanks to everyone interested and working to change default branch names!

Thanks to `@PurpleBooth` for [the original core API code](https://gist.github.com/PurpleBooth/6983e5c4def4f8721d4a697a3f4606a7).
