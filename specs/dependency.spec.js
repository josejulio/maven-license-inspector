'use strict';

const mocha = require('mocha');
const chai = require('chai');

const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;
const expect = chai.expect;

const Dependency = require('../lib/dependency');

describe('Dependency', () => {
  describe('Constructor', () => {
    it('Should create a new dependency', () => {
      const dep = new Dependency('org.rhq', 'rhq-cassandra-schema', '4.14.0-SNAPSHOT', 'Apache-2',
      [new Dependency.Specific('jar', 'compile')]);
      expect(dep.id).to.eql('org.rhq:rhq-cassandra-schema:4.14.0-SNAPSHOT');
      expect(dep.group).to.eql('org.rhq');
      expect(dep.name).to.eql('rhq-cassandra-schema');
      expect(dep.version).to.eql('4.14.0-SNAPSHOT');
      expect(dep.license).to.eql('Apache-2');
      expect(dep.specifics.length).to.eql(1);
      expect(dep.specifics[0].type).to.eql('jar');
      expect(dep.specifics[0].scope).to.eql('compile');
    });
  });
  describe('Properties', () => {
    let dependency = null;
    beforeEach(() => {
      dependency = new Dependency('org.rhq', 'rhq-cassandra-schema', '4.14.0-SNAPSHOT', 'Apache-2', 'jar', 'compile');
    });
    it('id should be readonly', () => {
      expect(() => { dependency.id = 'new_id'; }).to.throw(TypeError);
    });
  });
  describe('parseDependencies', () => {
    it('Should parse no dependencies', () => {
      expect(Dependency.parseDependencies([])).to.eql([]);
    });
    it('Should parse one dependency', () => {
      expect(Dependency.parseDependencies([
        'net.jpountz.lz4:lz4:jar:1.1.0:compile'
      ])).to.eql([
        new Dependency('net.jpountz.lz4', 'lz4', '1.1.0', null, [new Dependency.Specific('jar', 'compile')])
      ]);
    });
    it('Should parse two dependencies', () => {
      expect(Dependency.parseDependencies([
        'org.rhq:rhq-cassandra-schema:jar:4.14.0-SNAPSHOT:compile',
        'net.jpountz.lz4:lz4:jar:1.1.0:compile'
      ])).to.eql([
        new Dependency('org.rhq', 'rhq-cassandra-schema', '4.14.0-SNAPSHOT', null,
          [new Dependency.Specific('jar', 'compile')]),
        new Dependency('net.jpountz.lz4', 'lz4', '1.1.0', null, [new Dependency.Specific('jar', 'compile')])
      ]);
    });
    it('Should support dependency string with classifier', () => {
      expect(() => {
        Dependency.parseDependencies(['net.augeas:augeas-native:zip:el5:0.9.0-4:compile']);
      }).to.not.throw(Error);
    });
    it('Should load right a dependency string with classifier', () => {
      const dependency = Dependency.parseDependencies(['net.augeas:augeas-native:zip:el5:0.9.0-4:compile'])[0];
      expect(dependency.group).to.eql('net.augeas');
      expect(dependency.name).to.eql('augeas-native');
      expect(dependency.version).to.eql('0.9.0-4');
      expect(dependency.license).to.eql(null);
      expect(dependency.specifics.length).to.eql(1);
      expect(dependency.specifics[0].type).to.eql('zip');
      expect(dependency.specifics[0].classifier).to.eql('el5');
      expect(dependency.specifics[0].scope).to.eql('compile');
    });
    it('Should fail with wrong dependency string (less items)', () => {
      expect(() => {
        Dependency.parseDependencies(['net.augeas:augeas-native']);
      }).to.throw(Error);
    });
    it('Should fail with wrong dependency string (more items)', () => {
      expect(() => {
        Dependency.parseDependencies(['net.augeas:augeas-native:zip:el5:0.9.0-4:compile:wrong-stuff']);
      }).to.throw(Error);
    });
  });
});
