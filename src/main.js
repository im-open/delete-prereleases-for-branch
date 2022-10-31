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

function processReleases(releases) {
  const releasesToDelete = [];

  for (const release of releases) {
    const nameOrTagIncludesBranchPattern = release.name.includes(branchPattern) || release.tag_name.includes(branchPattern);
    if (release.prerelease && nameOrTagIncludesBranchPattern) {
      releasesToDelete.push({
        name: release.name,
        id: release.id,
        tag: release.tag_name
      });
    } else {
      const name = release.name;
      const tag = release.tag;
      const message = `\tRelease ${name} with tag ${tag} does not meet the pattern and will not be deleted`;
      core.info(message);
    }
  }
  core.info('\nFinished gathering releases, the following items are pre-releases that match the branch pattern.  They will be removed:');
  for (const r of releasesToDelete) {
    core.info(`\t${r.name}`);
  }
}
async function getListOfReleases() {
  let releasesToDelete = [];
  core.info(`Gathering list of releases with '${branchPattern}' in the name or tag to delete...`);

  await octokit
    .paginate(octokit.rest.repos.listReleases, {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })
    .then(releases => {
      releasesToDelete = processReleases(releases);
    })
    .catch(error => {
      core.setFailed(`An error occurred retrieving the releases: ${error.message}`);
    });

  return releasesToDelete;
}

async function deleteRelease(release) {
  core.info(`\nDeleting release ${release.name} (${release.id})...`);
  await octokit.rest.repos
    .deleteRelease({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      release_id: release.id
    })
    .then(() => {
      core.info(`Finished deleting release ${release.name} (${release.id}).`);
    })
    .catch(error => {
      core.warning(`There was an error deleting the release ${release.name} (${release.id}): ${error.message}`);
    });

  core.info(`Deleting tag ${release.tag}...`);
  await octokit.rest.git
    .deleteRef({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      ref: `tags/${release.tag}`
    })
    .then(() => {
      core.info(`Finished deleting tag ${release.tag}.`);
    })
    .catch(error => {
      core.warning(`There was an error deleting the tag ${release.tag}: ${error.message}`);
    });
}

async function run() {
  const releasesToDelete = await getListOfReleases();

  for (const r of releasesToDelete) {
    await deleteRelease(r);
  }
}

run();
