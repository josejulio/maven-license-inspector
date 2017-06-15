// Gather all dependencies from maven
const commandLineArgs = require('command-line-args');
const commandLineCommands = require('command-line-commands');
const maven = require('./lib/maven');
const Database = require('./lib/database');
const Dependency = require('./lib/dependency');


const validCommands = [null, 'add-license', 'remove-dependency'];
const { command, argv } = commandLineCommands(validCommands);

const databasePrefix = 'licenses';

if (command === null) {
  const optionDefinitions = [
    { name: 'skip-dependencies', alias: 's', type: Boolean },
    { name: 'path', alias: 'p', type: String }
  ];
  const options = commandLineArgs(optionDefinitions, argv);
  if (!('path' in options)) {
    throw Error('--path to pom.xml is required');
  }
  /**
    Workflow:
      1 - Fetch dependencies from maven POM (Filtered to remove own projects and tests)
      2 - Build a dependency database.
      3 - Build a POM with all the dependencies
      4 - Download licenses (with maven plugin)
      5 - update dependency to point to found licenses and save licenses
  */
  let dependencies = [];
  if (options['skip-dependencies'] !== true) {
    dependencies = maven.dependencies(
      options.path, {
        ignorePatterns: [
          /(^org\.rhq.*)|(.*-test.*)/
        ],
        mavenExtraArguments: '--settings settings.xml'
      }
    );
  }

  const db = new Database(databasePrefix);

  let lastDependencyCount = null;
  const updateDependenciesWhileAny = () => db.getAllDependencies((builder) => {
    builder.where('license', null);
  }).then((r) => {
    if (r.result.length === 0 || (lastDependencyCount !== null && lastDependencyCount === r.result.length)) {
      return true;
    }
    lastDependencyCount = r.result.length;
    return maven.downloadLicenses(r.result);
  }).then(rdownload => Promise.all([
    db.addLicenses(rdownload.licenses),
    db.updateLicenseOfDependencies(rdownload.dependencies)
  ]))
  .then(() => updateDependenciesWhileAny());

  db.importDependencies(Dependency.parseDependencies(dependencies))
  .then(() => {
    updateDependenciesWhileAny();
  })
  .catch(err => console.log(err));
} else if (command === 'add-license') {
  const optionDefinitions = [
    { name: 'name', alias: 'n', type: String, required: true },
    { name: 'url', alias: 'u', type: String, required: true },
    { name: 'id', alias: 'i', type: String, required: true }
  ];
  const options = commandLineArgs(optionDefinitions, argv);
  let missingRequisites = false;
  for (let i = 0; i < optionDefinitions.length; i += 1) {
    const option = optionDefinitions[i];
    if (option.required === true && !(option.name in options)) {
      console.log(`${option.name} is required.`);
      missingRequisites = true;
    }
  }
  if (missingRequisites) {
    throw Error('Missing requisites');
  }
  console.log(`Attemping to add license ${options.name} to ${options.id}`);

  const db = new Database(databasePrefix);
  const license = {
    key: options.url,
    url: options.url,
    name: options.name
  };
  db.addLicense(license)
  .then(() => db.getDependency(options.id))
  .then((r) => {
    const dependency = r.result;
    if (!dependency.license) {
      dependency.license = [];
    }
    dependency.license.push(license.key);
    console.log(dependency);
    return db.updateLicenseOfDependency(dependency);
  }).then(() => {
    console.log('License added');
  })
  .catch(e => console.log(e));
} else if (command === 'remove-dependency') {
  const optionDefinitions = [
    { name: 'id', alias: 'i', type: String }
  ];
  const options = commandLineArgs(optionDefinitions, argv);
  if ('id' in options) {
    console.log(`Removing ${options.id}`);
    const db = new Database(databasePrefix);
    db.removeDependency(options.id)
    .catch((e) => {
      console.log(e);
    });
  }
}
