module.exports = async (github, core, repo, releaseId) => {
  core.info(`\nAsserting that release ${releaseId} exists.`);
  const releaseResponse = await github.rest.repos.getRelease({
    owner: 'im-open',
    repo: repo,
    release_id: releaseId
  });

  if (!releaseResponse && !releaseResponse.data) {
    core.setFailed(`Release ${releaseId} does not appear to exist.`);
  } else {
    core.info(`Release ${releaseId} exists.`);
  }
};
