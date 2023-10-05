module.exports = async (github, core, repo, releaseId) => {
  if (releaseId && releaseId.length > 0) {
    await github.rest.repos
      .deleteRelease({
        owner: 'im-open',
        repo: repo,
        release_id: releaseId
      })
      .then(() => {
        core.info(`Release '${releaseId}' was successfully deleted.`);
      })
      .catch(() => {
        // errors can happen if the release doesn't exist.  We can ignore those.
        core.info(`Release '${releaseId}' does not appear to exist - do nothing.`);
      });
  } else {
    core.info(`ReleaseId was not provided - do nothing.`);
  }
};
