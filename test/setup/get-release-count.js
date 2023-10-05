module.exports = async (github, core, owner, repo) => {
  let numReleases;

  await github.rest.repos
    .listReleases({
      owner,
      repo
    })
    .then(response => {
      numReleases = response.data.length;
      core.info(`\nThe repo has ${numReleases} releases.`);
      core.setOutput('num-releases', numReleases);
      return numReleases;
    })
    .catch(error => {
      core.setFailed(`An error occurred getting the number of releases: ${error.message}`);
    });

  return numReleases;
};
