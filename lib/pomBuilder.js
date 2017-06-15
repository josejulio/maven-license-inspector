'use strict';

const xml = require('xml');

const buildDependencyPom = (dependencies) => {
  const dependenciesElement = [];
  const project = {
    project: [
      {
        _attr: {
          xmlns: 'http://maven.apache.org/POM/4.0.0',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd'
        }
      },
      { modelVersion: '4.0.0' },
      { groupId: 'org.rhq' },
      { artifactId: 'rhq-parent' },
      { version: '4.14.0-SNAPSHOT' },
      { packaging: 'pom' },
      { name: 'RHQ' },
      { description: 'RHQ is a server management and monitoring suite primarily targeted at JBoss software.' },
      { url: 'http://www.jboss.org/rhq/' },
      { inceptionYear: 2008 },
      {
        organization: [
          { name: 'Red Hat, Inc.' },
          { url: 'http://redhat.com/' }
        ]
      },
      { dependencies: dependenciesElement },
      { build: [
        { plugins: [
          { plugin: [
            { groupId: 'org.codehaus.mojo' },
            { artifactId: 'license-maven-plugin' },
            { version: '1.12' },
            { dependencies: [
              { dependency: [
                { groupId: 'org.apache.maven.doxia' },
                { artifactId: 'doxia-core' },
                { version: '1.4' }
              ] }
            ] }
          ] }
        ] }
      ] }
    ]
  };

  for (let i = 0; i < dependencies.length; i += 1) {
    const dep = dependencies[i];
    for (let j = 0; j < dep.specifics.length; j += 1) {
      const specific = dep.specifics[j];
      const dependencyElement = [
        { groupId: dep.group },
        { artifactId: dep.name },
        { version: dep.version },
        { type: specific.type }
      ];
      if (specific.classifier !== null) {
        dependencyElement.push({ classifier: specific.classifier });
      }
      dependenciesElement.push({
        dependency: dependencyElement
      });
    }
  }

  return xml(project, true);
};

module.exports = buildDependencyPom;
