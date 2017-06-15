'use strict';

const assert = require('assert');
const Dependency = require('./dependency.js');
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;
const chalk = require('chalk');
const fs = require('fs');
const PomBuilder = require('./pomBuilder');
const readEachLineSync = require('read-each-line-sync');
const trim = require('trim');
const tmp = require('tmp');
const xmlParser = require('xml-parser');
// const parseKeyValue = require('parse-key-value');

const assertNode = (node, name) => {
  assert.equal(node, name, `Expected node name [${name}] but found [${node}]`);
};

const getLicensesForNode = (node, map) => {
  const assignableMap = map;
  const foundLicenses = [];
  for (let i = 0; i < node.children.length; i += 1) {
    const licenseNode = node.children[i];
    assertNode(licenseNode.name, 'license');
    const license = {};
    licenseNode.children.forEach((att) => {
      if (att.name === 'name' || att.name === 'url') {
        license[att.name] = att.content;
      }
    });

    if (license.name && !license.url) {
      license.url = license.name.toLowerCase();
    }
    if (!license.name && license.url) {
      license.name = license.url.toLowerCase();
    }

    if (!license.name || !license.url) {
      throw Error('Expected name and url attributes to have values, but ' +
      `name=[${license.name}] and url=[${license.url}]`);
    }
    license.key = license.url;
    if (!assignableMap[license.key]) {
      assignableMap[license.key] = license;
    }
    foundLicenses.push(license.key);
  }
  return foundLicenses;
};

const runCommand = (command, path, asynchronous, customOptions) => {
  const options = {
    cwd: path,
    killSignal: 'SIGTERM',
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['inherit', 'pipe', 'inherit']
  };
  if (customOptions) {
    Object.assign(options, customOptions);
  }
  console.log(chalk.cyan(`Running '${command}' in directory: ${path}`));
  const executable = asynchronous ? exec : execSync;
  const dc = executable(command, options);
  dc && dc.stdout && dc.stdout.on('data', (data) => {
    data && console.log(`${data}`);
  });
  dc && dc.stderr && dc.stderr.on('data', (data) => {
    data && console.log(`stderr: ${data}`);
  });
  return dc;
};

const getDependencies = (pomPath, args = {}) => {
  const { ignorePatterns, mavenExtraArguments } = Object.assign({
    ignorePatterns: [],
    mavenExtraArguments: ''
  }, args);
  const tmpName = tmp.tmpNameSync();
  runCommand(
    `mvn ${mavenExtraArguments} -q org.apache.maven.plugins:maven-dependency-plugin:2.10:list -DoutputFile=${tmpName} \
    -DappendOutput=true -DincludeScope="runtime"`,
    pomPath,
    false
  );
  const dependencies = new Set();
  readEachLineSync(tmpName, (line) => {
    const processedLine = trim(line);

    // Remove unwanted lines
    if (processedLine === '' ||
        processedLine === 'The following files have been resolved:' ||
        processedLine === 'none') {
      return;
    }

    for (let i = 0; i < ignorePatterns.length; i += 1) {
      if (ignorePatterns[i].test(processedLine)) {
        return;
      }
    }
    dependencies.add(processedLine);
  });
  return Array.from(dependencies);
};

const downloadLicenses = (dependencies, args = {}) => {
  const { mavenExtraArguments } = Object.assign({
    mavenExtraArguments: ''
  }, args);

  const tmpDir = tmp.dirSync();
  fs.writeSync(fs.openSync(`${tmpDir.name}/pom.xml`, 'w'), PomBuilder(dependencies));
  runCommand(
    `mvn ${mavenExtraArguments} org.codehaus.mojo:license-maven-plugin:1.12:download-licenses`,
    tmpDir.name,
    false
  );

  const xml = xmlParser(fs.readFileSync(`${tmpDir.name}/target/generated-resources/licenses.xml`, 'utf8'));

  const dependencyMap = {};
  dependencies.forEach((dependency) => {
    dependencyMap[dependency.id] = dependency;
  });

  const licenseMap = {};

  assertNode(xml.root.name, 'licenseSummary');
  assertNode(xml.root.children[0].name, 'dependencies');
  const dependenciesNode = xml.root.children[0].children;
  for (let i = 0; i < dependenciesNode.length; i += 1) {
    const child = dependenciesNode[i];
    assertNode(child.name, 'dependency');
    const childAttributes = {};
    child.children.forEach((att) => {
      if (att.name === 'licenses') {
        childAttributes.licenses = getLicensesForNode(att, licenseMap);
      } else {
        if (childAttributes[att.name]) {
          throw Error(`Found attribute [${att.name}] with content [${att.content}]` +
             `but already had [${childAttributes[att.name]}]`);
        }
        childAttributes[att.name] = att.content;
      }
    });

    const foundDependency = new Dependency(
      childAttributes.groupId,
      childAttributes.artifactId,
      childAttributes.version);

    if (!dependencyMap[foundDependency.id]) {
      // We found a new dependency. we might as well add it.
      dependencyMap[foundDependency.id] = foundDependency;
    }
    dependencyMap[foundDependency.id].license = childAttributes.licenses;
  }

  return {
    dependencies,
    licenses: Object.keys(licenseMap).map(key => licenseMap[key])
  };
};

module.exports = {
  dependencies: getDependencies,
  downloadLicenses
};
