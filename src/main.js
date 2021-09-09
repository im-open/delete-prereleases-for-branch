const core = require('@actions/core');
const github = require('@actions/github');

const requiredArgOptions = {
  required: true,
  trimWhitespace: true
};
const token = core.getInput('github-token', requiredArgOptions);
const branchNameInput = core.getInput('branch-name', requiredArgOptions);
const branchName = branchNameInput.replace('refs/heads/', '').replace(/[^a-zA-Z0-9-]/g, '-');
const branchPattern = `-${branchName}.`;
const octokit = github.getOctokit(token);

async function getListOfReleases() {
  let hasMoreReleases = true;
  let releasesToDelete = [];
  let page = 1;
  const maxResultsPerPage = 26;
  core.info(`Gathering list of releases with '${branchPattern}' in the name or tag to delete...`);

  while (hasMoreReleases) {
    const response = await octokit.rest.repos.listReleases({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      per_page: maxResultsPerPage,
      page: page
    });

    if (response.status == 200) {
      if (response.data) {
        if (response.data.length < maxResultsPerPage) {
          hasMoreReleases = false;
        } else {
          page += 1;
        }

        for (let index = 0; index < response.data.length; index++) {
          const release = response.data[index];
          if (
            release.prerelease &&
            (release.name.indexOf(branchPattern) > -1 ||
              release.tag_name.indexOf(branchPattern) > -1)
          ) {
            releasesToDelete.push({
              name: release.name,
              id: release.id,
              tag: release.tag_name
            });
          } else {
            core.info(
              `Release ${release.name} with tag ${release.tag_name} does not meet the pattern and will not be deleted`
            );
          }
        }
      } else {
        core.info('Finished getting releases for the repository.');
      }
    } else {
      core.setFailed(`An error occurred retrieving page ${page} of releases.`);
    }
  }

  core.info('Finished gathering releases, the following items will be removed:');
  console.log(releasesToDelete); //Normally I'd make this core.info but it doesn't print right with JSON.stringify()

  return releasesToDelete;
}

async function deleteRelease(release) {
  try {
    core.info(`\nDeleting release ${release.name} (${release.id})...`);
    await octokit.rest.repos.deleteRelease({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      release_id: release.id
    });

    core.info(`Deleting tag ${release.tag}...`);
    await octokit.rest.git.deleteRef({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: `tags/${release.tag}`
    });

    core.info(`Finished deleting release ${release.name} (${release.id}) and tag ${release.tag}.`);
  } catch (error) {
    core.warning(
      `There was an error deleting the release ${release.name} (${release.id}) or tag ${release.tag}: ${error.message}`
    );
  }
}

async function run() {
  let releasesToDelete = await getListOfReleases();

  for (let index = 0; index < releasesToDelete.length; index++) {
    await deleteRelease(releasesToDelete[index]);
  }
}

run();
