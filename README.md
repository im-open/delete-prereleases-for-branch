# delete-prereleases-for-branch

This action will retrieve a list of releases for the repository and delete any releases and associated tags that:

- Are marked as pre-release.  
  - This action will not delete regular releases.
- Are returned in the [list releases] API call.
  - Depending on the permissions of the token it may return only published releases (not draft releases).
- Have a release name or tag that follows [im-open/git-version-lite]'s format:
  - Format: `major.minor.patch-<sanitized-branch-name>.<formated-date>`
  - To sanitize the branch name, the characters `a-z, A-Z, 0-9, -` are kept and any other character is replaced with `-`.  

If the action runs into an issue deleting a specific release, it will generate a warning that can be viewed in the Summary section of the workflow rather than failing the step.  Errors retrieving the releases will still cause the action to fail though.

## Index <!-- omit in toc -->

- [delete-prereleases-for-branch](#delete-prereleases-for-branch)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Usage Examples](#usage-examples)
  - [Contributing](#contributing)
    - [Incrementing the Version](#incrementing-the-version)
    - [Source Code Changes](#source-code-changes)
    - [Recompiling Manually](#recompiling-manually)
    - [Updating the README.md](#updating-the-readmemd)
    - [Tests](#tests)
  - [Code of Conduct](#code-of-conduct)
  - [License](#license)
  
## Inputs

| Parameter           | Is Required | Description                                                                                                                                                                                                                                                   |
|---------------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `github-token`      | true        | A token with permission to delete releases in the repository.                                                                                                                                                                                                 |
| `branch-name`       | true        | The branch the releases were created for.                                                                                                                                                                                                                     |
| `strict-match-mode` | false       | Flag that determines the pattern the action will use to identify matches in the release name and tag.  Defaults to `true`.<br/>• `true: -<sanitized-branch-name>.` Releases created with [git-version-lite] tags follow this pattern.<br/>• `false: <sanitized-branch-name>` |

## Outputs

No Outputs

## Usage Examples

```yml
on:
  pull_request:
    types: [closed]
jobs:
  cleanup:
    runs-on: ubuntu-latest
    
    steps:
      - name: Clean up the releases that were created for this branch
        uses: im-open/delete-prereleases-for-branch@v1.2.0  # Major (@v1) and major.minor (@v1.2) tags are also available
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          branch-name: ${{ github.head_ref }}
```

## Contributing

When creating PRs, please review the following guidelines:

- [ ] The action code does not contain sensitive information.
- [ ] At least one of the commit messages contains the appropriate `+semver:` keywords listed under [Incrementing the Version] for major and minor increments.
- [ ] The action has been recompiled.  See [Recompiling Manually] for details.
- [ ] The README.md has been updated with the latest version of the action.  See [Updating the README.md] for details.
- [ ] Any tests in the [build-and-review-pr] workflow are passing

### Incrementing the Version

This repo uses [git-version-lite] in its workflows to examine commit messages to determine whether to perform a major, minor or patch increment on merge if [source code] changes have been made.  The following table provides the fragment that should be included in a commit message to active different increment strategies.

| Increment Type | Commit Message Fragment                     |
|----------------|---------------------------------------------|
| major          | +semver:breaking                            |
| major          | +semver:major                               |
| minor          | +semver:feature                             |
| minor          | +semver:minor                               |
| patch          | *default increment type, no comment needed* |

### Source Code Changes

The files and directories that are considered source code are listed in the `files-with-code` and `dirs-with-code` arguments in both the [build-and-review-pr] and [increment-version-on-merge] workflows.  

If a PR contains source code changes, the README.md should be updated with the latest action version and the action should be recompiled.  The [build-and-review-pr] workflow will ensure these steps are performed when they are required.  The workflow will provide instructions for completing these steps if the PR Author does not initially complete them.

If a PR consists solely of non-source code changes like changes to the `README.md` or workflows under `./.github/workflows`, version updates and recompiles do not need to be performed.

### Recompiling Manually

This command utilizes [esbuild] to bundle the action and its dependencies into a single file located in the `dist` folder.  If changes are made to the action's [source code], the action must be recompiled by running the following command:

```sh
# Installs dependencies and bundles the code
npm run build
```

### Updating the README.md

If changes are made to the action's [source code], the [usage examples] section of this file should be updated with the next version of the action.  Each instance of this action should be updated.  This helps users know what the latest tag is without having to navigate to the Tags page of the repository.  See [Incrementing the Version] for details on how to determine what the next version will be or consult the first workflow run for the PR which will also calculate the next version.

### Tests

The build and review PR workflow includes tests which are linked to a status check. That status check needs to succeed before a PR is merged to the default branch.  When a PR comes from a branch, there should not be any issues running the tests. When a PR comes from a fork, tests may not have the required permissions or access to run since the `GITHUB_TOKEN` only has `read` access set for all scopes. Also, forks cannot access other secrets in the repository.  In these scenarios, a fork may need to be merged into an intermediate branch by the repository owners to ensure the tests run successfully prior to merging to the default branch.

## Code of Conduct

This project has adopted the [im-open's Code of Conduct](https://github.com/im-open/.github/blob/main/CODE_OF_CONDUCT.md).

## License

Copyright &copy; 2023, Extend Health, LLC. Code released under the [MIT license](LICENSE).

<!-- Links -->
[Incrementing the Version]: #incrementing-the-version
[Recompiling Manually]: #recompiling-manually
[Updating the README.md]: #updating-the-readmemd
[source code]: #source-code-changes
[usage examples]: #usage-examples
[build-and-review-pr]: ./.github/workflows/build-and-review-pr.yml
[increment-version-on-merge]: ./.github/workflows/increment-version-on-merge.yml
[esbuild]: https://esbuild.github.io/getting-started/#bundling-for-node
[git-version-lite]: https://github.com/im-open/git-version-lite
[im-open/git-version-lite]: https://github.com/im-open/git-version-lite
[list releases]: https://docs.github.com/en/rest/reference/repos#list-releases
