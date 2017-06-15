'use strict';

const equal = require('equals');

const Dependency = function DependencyClass(group, name, version, license = null,
  specifics) {
  this.group = group;
  this.name = name;
  this.version = version;

  this.specifics = specifics;
  this.license = license;
};

Dependency.Specific = function SpecificClass(type, scope, classifier = null) {
  this.type = type;
  this.scope = scope;
  this.classifier = classifier;
};

Object.defineProperty(Dependency.prototype, 'id', {
  get() {
    const properties = [this.group, this.name, this.version];
    return properties.join(':');
  }
});

Dependency.prototype.mergeSpecifics = function mergeSpecifics(other) {
  if (this.id !== other.id) {
    throw new Error(`Can only merge specifics on same Dependency [${this.id}] vs [${other.id}]`);
  }
  const mergedSpecifics = [].concat(this.specifics);
  for (let i = 0; i < other.specifics.length; i += 1) {
    let merge = true;
    for (let j = 0; j < this.specifics.length; j += 1) {
      if (equal(this.specifics[j], other.specifics[i])) {
        merge = false;
        break;
      }
    }
    if (merge) {
      mergedSpecifics.push(other.specifics[i]);
    }
  }
  return mergedSpecifics;
};

Dependency.parseDependencies = function parseDependencies(dependencies = []) {
  const parsedDependencies = [];
  for (let i = 0; i < dependencies.length; i += 1) {
    const dependency = dependencies[i].split(':');
    if (dependency.length < 5 || dependency.length > 6) {
      throw Error(`Invalid dependency string: [${dependencies[i]}]`);
    }
    // With classifier net.augeas:augeas-native:zip:el5:0.9.0-4:compile
    // Without classifier net.sf.trove4j:trove4j:jar:3.0.3:compile
    if (dependency.length === 5) { // Common case without classifier
      dependency.splice(3, 0, null);
    }
    // net.augeas  :  augeas-native  :  zip  :     el5     :  0.9.0-4  :  compile
    //    group           name          type    classifier    version      scope
    //      0              1             2          3            4           5
    parsedDependencies.push(new Dependency(
      dependency[0], dependency[1], dependency[4], null,
      [new Dependency.Specific(dependency[2], dependency[5], dependency[3])]
    ));
  }
  return parsedDependencies;
};

Dependency.fromObject = function fromObject({ group, name, version, license = null, specifics = [] }) {
  const specificArray = [];
  specifics.forEach((specific) => {
    specificArray.push(Dependency.Specific.fromObject(specific));
  });
  return new Dependency(group, name, version, license, specificArray);
};

Dependency.Specific.fromObject = function specificFromObject({ type, scope, classifier }) {
  return new Dependency.Specific(type, scope, classifier);
};

module.exports = Dependency;
