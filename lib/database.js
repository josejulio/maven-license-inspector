'use strict';

const equal = require('equals');
const NoSQL = require('nosql');
const Dependency = require('./dependency.js');
const Promise = require('promise');


// This method returns a callback (err, results, count) => { ... }
const DatabaseBuilderCallback = (resolve, reject, processResults) => (err, results, count) => {
  if (err) {
    reject(err);
  }
  if (processResults) {
    resolve(processResults(results, count));
  } else {
    resolve({ result: results, count });
  }
};

const DatabaseBuilderToDependency = (resolve, reject) => DatabaseBuilderCallback(resolve, reject, (results, count) => {
  if (count === 0) {
    return { result: results, count };
  }
  let dependencyResults = [];
  if (results instanceof Array) {
    results.forEach((result) => {
      dependencyResults.push(Dependency.fromObject(result));
    });
  } else {
    dependencyResults = Dependency.fromObject(results);
  }
  return { result: dependencyResults, count };
});

const Database = function DatabaseClass(databasePathPrefix) {
  this.dependencies = NoSQL.load(`${databasePathPrefix}-dependencies`);
  this.licenses = NoSQL.load(`${databasePathPrefix}-licenses`);
  this.dependenciesBackup = `${databasePathPrefix}-dependencies.bk`;
};

Database.prototype.importDependencies = function importDependencies(dependencies) {
  const allInserts = [];
  for (let i = 0; i < dependencies.length; i += 1) {
    allInserts.push(this.importDependency(dependencies[i]));
  }
  return Promise.all(allInserts).then((rs) => {
    const resultObject = { result: [], count: rs.length };
    rs.forEach((r) => {
      resultObject.result.push(r.result);
    });
    return resultObject;
  });
};

Database.prototype.importDependency = function importDependency(dependency) {
  const insertedDependency = Object.assign({ id: dependency.id }, dependency);
  return this.getDependency(insertedDependency.id)
  .then((r) => {
    if (r.count === 1) {
      insertedDependency.specifics = dependency.mergeSpecifics(r.result);
      if (equal(r.result.specifics, insertedDependency.specifics)) {
        return 0; // No need to insert/update anything, found object is the same
      }
    }
    return new Promise((resolve, reject) => {
      this.dependencies.update(insertedDependency, insertedDependency)
      .where('id', insertedDependency.id)
      .callback(DatabaseBuilderCallback(resolve, reject));
    });
  });
};

Database.prototype.getDependency = function getDependency(dependencyId) {
  return new Promise((resolve, reject) => {
    this.dependencies.one()
    .where('id', dependencyId)
    .callback(DatabaseBuilderToDependency(resolve, reject));
  });
};

Database.prototype.getAllDependencies = function getAllDependencies(builderScope = null) {
  return new Promise((resolve, reject) => {
    const builder = this.dependencies.find();
    if (builderScope) {
      builder.make(builderScope);
    }
    builder.callback(DatabaseBuilderToDependency(resolve, reject));
  });
};

Database.prototype.removeDependency = function removeDependency(dependencyId) {
  return new Promise((resolve, reject) => {
    this.dependencies.remove(this.dependenciesBackup)
    .where('id', dependencyId)
    .callback(DatabaseBuilderToDependency(resolve, reject));
  });
};

Database.prototype.updateLicenseOfDependencies = function updateLicenseOfDependencies(dependencies) {
  const allPromises = [];
  dependencies.forEach((dependency) => {
    allPromises.push(this.updateLicenseOfDependency(dependency));
  });
  return Promise.all(allPromises);
};

Database.prototype.updateLicenseOfDependency = function updateLicenseOfDependency(dependency) {
  return new Promise((resolve, reject) => {
    this.dependencies.modify({ license: dependency.license }, dependency)
    .where('id', dependency.id)
    .callback(DatabaseBuilderCallback(resolve, reject));
  });
};

Database.prototype.addLicense = function addLicense(license) {
  return new Promise((resolve, reject) => {
    this.licenses.insert(license, true)
    .where('key', license.key)
    .callback(DatabaseBuilderCallback(resolve, reject));
  });
};

Database.prototype.addLicenses = function addLicenses(licenses) {
  const allPromises = [];
  licenses.forEach((license) => {
    allPromises.push(this.addLicense(license));
  });
  return Promise.all(allPromises);
};

module.exports = Database;
