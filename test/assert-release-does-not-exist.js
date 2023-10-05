module.exports = async (github, core, repo, releaseId) => {
  core.info(`\nAsserting that release ${releaseId} does not exist.`);
  await github.rest.repos
    .getRelease({
      owner: 'im-open',
      repo: repo,
      release_id: releaseId
    })
    .then(() => {
      core.setFailed(`Release ${releaseId} exists which it should not.`);
    })
    .catch(() => {
      core.info(`Release ${releaseId} does not appear to exist which is expected.`);
    });
};
