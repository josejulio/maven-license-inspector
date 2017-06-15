# maven-license-inspector
Gather all the dependencies and licenses from your maven project

This is a wrapper on maven commands `mvn org.apache.maven.plugins:maven-dependency-plugin:2.10:list` and `mvn org.codehaus.mojo:license-maven-plugin:1.12:download-licenses`.
It parses the output of those commands to build a `licenses-dependencies.nosql` that which contains all the dependencies (including transitive dependencies) found on your project (It will include all subprojects) in json format and `licenses-licenses.nosql` with the licenses found on the dependencies.
Each dependency will include a reference to the licenses reported.

# Usage

## Scan your dependencies
`node . P_PATH` will start a scan on your project P_PATH/pom.xml

You can also specify regular expressions to ignore certain dependencies from the output of `mvn org.apache.maven.plugins:maven-dependency-plugin:2.10:list`. See [index.js](https://github.com/josejulio/maven-license-inspector/blob/master/index.js#L36) on `maven.dependencies
`call

## Manually add licenses
After the files are generated, you can manually add licenses (used it to fill the gaps left by it) by doing.
`node . add-license --name LICENSE_NAME --url LICENSE_URL --id DEPENDENCY_ID` where DEPENDENCY_ID is the id of each row in `licenses-dependencies.nosql`

## Manually remove dependencies
You can also remove dependencies using `node . remove-dependency --id DEPENDENCY_ID`. The dependency will be removed and added to `licenses-dependencies-bk.nosql`.

# Know issues
Not fully parametrized, lots of defaults are still on `index.js`
