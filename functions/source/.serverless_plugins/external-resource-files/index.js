'use strict';

class ExternalResourceFileHandler {
  constructor(serverless) {
    this.sls = serverless;

    this.commands = {
      package: {
        lifecycleEvents: ['mergeExternalResourceFiles']
      }
    };

    this.hooks = {
      'package:mergeExternalResourceFiles': this.mergeExternalResourceFiles.bind(this)
    };
  }

  mergeExternalResourceFiles() {
    this.sls.cli.log('Merging external file resources...');

    const { resources } = this.sls.service;
    if (!resources) {
      this.sls.cli.log('No Serverless Resources section, nothing to merge.');
      return;
    }

    if (!resources.externalResourceFiles) {
      this.sls.cli.log('No external files defined, nothing to merge.');
      return;
    }

    resources.Resources = resources.Resources || {};

    for (const externalResourceFile of resources.externalResourceFiles) {
      for (const resourceName in { ...externalResourceFile.Resources }) {
        if (resourceName in resources.Resources) {
          throw new Error(`Duplicate Resource: ${resourceName}`);
        }

        this.sls.cli.log(`Adding external resource: ${resourceName}`);
        resources.Resources[resourceName] = externalResourceFile.Resources[resourceName];
      }
    }

    delete resources.externalResourceFiles;

    this.sls.cli.log('The merging is complete.');
  }
}

module.exports = ExternalResourceFileHandler;
