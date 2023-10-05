module.exports = async (github, core, repo, tag) => {
  if (tag && tag.length > 0) {
    await github.rest.git
      .deleteRef({
        owner: 'im-open',
        repo: repo,
        ref: `tags/${tag}`
      })
      .then(() => {
        core.info(`Tag '${tag}' was successfully deleted.`);
      })
      .catch(() => {
        // errors can happen if the tag doesn't exist.  We can ignore those.
        core.info(`Tag '${tag}' does not appear to exist - do nothing.`);
      });
  } else {
    core.info(`Tag was not provided - do nothing.`);
  }
};
