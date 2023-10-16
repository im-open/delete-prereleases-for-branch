const core = require('@actions/core');
const github = require('@actions/github');

const requiredArgOptions = {
  required: true,
  trimWhitespace: true
};

const token = core.getInput('github-token', requiredArgOptions);
const branchNameInput = core.getInput('branch-name', requiredArgOptions);
const strictMatchMode = core.getBooleanInput('strict-match-mode', requiredArgOptions);

const orgName = github.context.repo.owner;
const repoName = github.context.repo.repo;
const octokit = github.getOctokit(token);

async function deleteReleaseAndTag(release) {
  core.info(`\nDeleting release '${release.name || release.tag}' with ID '${release.id}'...`);
  await octokit.rest.repos
    .deleteRelease({
      owner: orgName,
      repo: repoName,
      release_id: release.id
    })
    .then(() => {
      core.info(`Finished deleting release '${release.name || release.tag}' with ID '${release.id}'.`);
    })
    .catch(error => {
      core.warning(`There was an error deleting release '${release.name || release.tag}' with ID '${release.id}': ${error.message}`);
    });

  core.info(`Deleting tag '${release.tag}'...`);
  await octokit.rest.git
    .deleteRef({
      owner: orgName,
      repo: repoName,
      ref: `tags/${release.tag}`
    })
    .then(() => {
      core.info(`Finished deleting tag '${release.tag}'.`);
    })
    .catch(error => {
      core.warning(`There was an error deleting the tag '${release.tag}': ${error.message}`);
    });
}

function processReleases(rawReleases, branchPattern) {
  const preReleasesToDelete = [];
  const preReleasesToKeep = [];
  const regReleasesToKeep = [];

  core.startGroup('Processing releases....');
  for (const release of rawReleases) {
    const releaseName = release.name || '';
    const releaseTag = release.tag_name || '';
    core.info(`\nCheck release ${release.id}`);
    core.info(`Name: "${releaseName}"`);
    core.info(`Tag: "${releaseTag}"`);

    if (!release.prerelease) {
      regReleasesToKeep.push(releaseName || releaseTag);
      core.info(`The release is not a pre-release.  Keep it.`);
      continue;
    }

    const tagIncludesPattern = releaseTag.includes(branchPattern);
    const nameIncludesPattern = releaseName.includes(branchPattern);
    if (tagIncludesPattern || nameIncludesPattern) {
      preReleasesToDelete.push({
        name: releaseName,
        id: release.id,
        tag: releaseTag
      });
      if (tagIncludesPattern) core.info(`The prerelease's tag includes '${branchPattern}'.  Delete it.`);
      if (nameIncludesPattern) core.info(`The prerelease's name includes '${branchPattern}'.  Delete it.`);
    } else {
      core.info(`The prerelease's name and tag do not include '${branchPattern}'.  Keep it.`);
      preReleasesToKeep.push(releaseName || releaseTag);
    }
  }
  core.endGroup();
  core.info('Finished processing releases.\n');

  if (regReleasesToKeep.length > 0) {
    core.startGroup('Releases to keep');
    core.info(`\nThe following releases are not pre-releases so they will be kept:\n\t${regReleasesToKeep.join('\n\t')}`);
    core.endGroup();
  }

  if (preReleasesToKeep.length > 0) {
    core.startGroup('Pre-releases to keep');
    core.info(`\nThe following pre-releases do not include the string '${branchPattern}' so they will be kept:\n\t${preReleasesToKeep.join('\n\t')}`);
    core.endGroup();
  }

  if (preReleasesToDelete.length > 0) {
    core.startGroup('Pre-releases to delete');
    const relToDelete = preReleasesToDelete.map(r => r.name || r.tag);
    core.info(`\nThe following pre-releases include the string '${branchPattern}' and they will be deleted:\n\t${relToDelete.join('\n\t')}`);
    core.endGroup();
  } else {
    core.info(`\nNo pre-releases included '${branchPattern}'. Nothing will be deleted.`);
  }

  return preReleasesToDelete;
}

function sortReleases(releases) {
  // Not all releases have names, so we need to sort by tag_name if name is not available
  return releases.sort((a, b) => ((a.name || a.tag_name) < (b.name || b.tag_name) ? 1 : (b.name || b.tag_name) < (a.name || a.tag_name) ? -1 : 0));
}

async function getListOfReleases(branchName, branchPattern) {
  let preReleasesToDelete = [];
  if (strictMatchMode) {
    core.info(`\nFinding pre-releases for the '${branchName}' branch that include '${branchPattern}' in the name or tag...`);
  } else {
    core.info(`\nFinding pre-releases that include '${branchPattern}' in the name or tag...`);
  }

  await octokit
    .paginate(octokit.rest.repos.listReleases, {
      owner: orgName,
      repo: repoName
    })
    .then(rawReleases => {
      const sortedReleases = sortReleases(rawReleases);
      preReleasesToDelete = processReleases(sortedReleases, branchPattern);
    })
    .catch(error => {
      core.setFailed(`An error occurred retrieving the releases: ${error.message}`);
    });

  return preReleasesToDelete;
}

async function run() {
  core.info(`Deleting pre-releases in ${orgName}/${repoName}...`);

  const branchName = branchNameInput.replace('refs/heads/', '').replace(/[^a-zA-Z0-9-]/g, '-');
  const branchPattern = strictMatchMode ? `-${branchName}.` : branchName;

  core.info(`Strict match mode: ${strictMatchMode}`);
  core.info(`Branch name input: '${branchNameInput}'`);
  core.info(`Sanitized Branch name: '${branchName}'`);
  core.info(`Pattern to match: '${branchPattern}'`);

  const preReleasesToDelete = await getListOfReleases(branchName, branchPattern);

  for (const r of preReleasesToDelete) {
    await deleteReleaseAndTag(r);
  }

  core.info(`Finished deleting pre-releases in ${orgName}/${repoName}.`);
}

run();
