module.exports = async (staticArgs, dynamicArgs) => {
  const { github, core, owner, repo } = staticArgs;
  const { tag, prerelease, name, outputName } = dynamicArgs;

  await github.rest.repos
    .createRelease({
      owner,
      repo,
      tag_name: tag,
      name,
      prerelease
    })
    .then(response => {
      core.info(`\nRelease created for '${outputName}' with id '${response.data.id}'`);
      console.log(dynamicArgs);
      core.setOutput(outputName, response.data.id);
    })
    .catch(error => {
      core.setFailed(`An error occurred creating the '${outputName}' release: ${error.message}`);
    });
};
