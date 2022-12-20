const core = require('@actions/core');
const github = require('@actions/github');

const requiredArgOptions = {
  required: true,
  trimWhitespace: true
};

const token = core.getInput('github-token', requiredArgOptions);
const branchNameInput = core.getInput('branch-name', requiredArgOptions);
const orgName = github.context.repo.owner;
const repoName = github.context.repo.repo;

const branchName = branchNameInput.replace('refs/heads/', '').replace(/[^a-zA-Z0-9-]/g, '-');
const branchPattern = `-${branchName}.`;
const octokit = github.getOctokit(token);

function processReleases(rawReleases) {
  const releasesToDelete = [];
  const releasesToKeep = [];

  for (const release of rawReleases) {
    const releaseName = release.name;
    const releaseTag = release.tag_name;

    if (release.prerelease) {
      const nameOrTagIncludesBranchPattern =
        (releaseName && releaseName.includes(branchPattern)) || (releaseTag && releaseTag.includes(branchPattern));
      if (nameOrTagIncludesBranchPattern) {
        releasesToDelete.push({
          name: releaseName,
          id: release.id,
          tag: releaseTag
        });
      } else {
        releasesToKeep.push(releaseName || releaseTag);
      }
    }
  }
  if (releasesToKeep.length > 0) {
    core.info(`\nThe following pre-releases do not include '${branchPattern}' and will not be deleted:`);
    for (const r of releasesToKeep) {
      core.info(`\t${r}`);
    }
  } else {
    const prereleaseMessage =
      releasesToDelete.length > 0
        ? `\nAll pre-releases include '${branchPattern}'.  No pre-releases will be kept.`
        : `\nThere are no pre-releases in this repository.`;
    core.info(prereleaseMessage);
  }

  if (releasesToDelete.length > 0) {
    core.info(`\nThe following pre-releases include '${branchPattern}' and they will be removed:`);
    for (const r of releasesToDelete) {
      core.info(`\t${r.name || r.tag}`);
    }
  } else {
    core.info(`\nNo pre-releases included '${branchPattern}'. Nothing will be deleted.`);
  }

  return releasesToDelete;
}

function sortReleases(releases) {
  return releases.sort((a, b) => ((a.name || a.tag_name) < (b.name || b.tag_name) ? 1 : (b.name || b.tag_name) < (a.name || a.tag_name) ? -1 : 0));
}

async function getListOfReleases() {
  let releasesToDelete = [];
  core.info(`\nChecking for pre-releases for the '${branchNameInput}' branch that include '${branchPattern}' in the name or tag...`);

  await octokit
    .paginate(octokit.rest.repos.listReleases, {
      owner: orgName,
      repo: repoName
    })
    .then(rawReleases => {
      releasesToDelete = processReleases(sortReleases(rawReleases));
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
      owner: orgName,
      repo: repoName,
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
      owner: orgName,
      repo: repoName,
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
  core.info(`Checking for pre-releases in ${orgName}/${repoName}`);
  const releasesToDelete = await getListOfReleases();

  for (const r of releasesToDelete) {
    await deleteRelease(r);
  }
}

run();
