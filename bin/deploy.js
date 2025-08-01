import fs from 'fs-extra';
import axios from 'axios';

import dotenv from 'dotenv';

import { pbcopy, shellCd, shellExec } from '../src/server/process.js';
import { loggerFactory } from '../src/server/logger.js';
import {
  Config,
  addApiConf,
  addClientConf,
  buildApiSrc,
  buildClientSrc,
  cloneConf,
  loadConf,
  loadReplicas,
  addWsConf,
  buildWsSrc,
  cloneSrcComponents,
  getDeployGroupId,
  deployRun,
  getDataDeploy,
  buildReplicaId,
  Cmd,
  restoreMacroDb,
  fixDependencies,
  setUpProxyMaintenanceServer,
  writeEnv,
  getUnderpostRootPath,
  buildCliDoc,
} from '../src/server/conf.js';
import { buildClient } from '../src/server/client-build.js';
import { range, s4, setPad, timer, uniqueArray } from '../src/client/components/core/CommonJs.js';
import { MongooseDB } from '../src/db/mongo/MongooseDB.js';
import { Lampp } from '../src/runtime/lampp/Lampp.js';
import { DefaultConf } from '../conf.js';
import { JSONweb } from '../src/server/client-formatted.js';

import { Xampp } from '../src/runtime/xampp/Xampp.js';
import { ejs } from '../src/server/json-schema.js';
import { getLocalIPv4Address, ip } from '../src/server/dns.js';
import { Downloader } from '../src/server/downloader.js';
import colors from 'colors';
import { program } from '../src/cli/index.js';

colors.enable();

const logger = loggerFactory(import.meta);

logger.info('argv', process.argv);

const [exe, dir, operator] = process.argv;

try {
  switch (operator) {
    case 'save':
      {
        const deployId = process.argv[3];
        const folder = `./engine-private/conf/${deployId}`;
        if (fs.existsSync(folder)) fs.removeSync(folder);
        await Config.build({ folder });
        fs.writeFileSync(`${folder}/.env.production`, fs.readFileSync('./.env.production', 'utf8'), 'utf8');
        fs.writeFileSync(`${folder}/.env.development`, fs.readFileSync('./.env.development', 'utf8'), 'utf8');
        fs.writeFileSync(`${folder}/.env.test`, fs.readFileSync('./.env.test', 'utf8'), 'utf8');
        fs.writeFileSync(`${folder}/package.json`, fs.readFileSync('./package.json', 'utf8'), 'utf8');
      }
      break;
    case 'add-nodejs-app-client-conf':
      {
        const toOptions = {
          deployId: process.argv[3],
          clientId: process.argv[4],
          host: process.argv[5],
          path: process.argv[6],
        };
        const fromOptions = { deployId: process.argv[7], clientId: process.argv[8] };
        addClientConf({ toOptions, fromOptions });
      }
      break;
    case 'build-nodejs-conf-app':
      {
        const toOptions = { deployId: process.argv[3], clientId: process.argv[4] };
        const fromOptions = { deployId: process.argv[5], clientId: process.argv[6] };
        cloneConf({ toOptions, fromOptions });
      }
      break;
    case 'clone-nodejs-src-client-components':
      {
        const fromOptions = { componentsFolder: process.argv[3] };
        const toOptions = { componentsFolder: process.argv[4] };
        cloneSrcComponents({ toOptions, fromOptions });
      }
      break;
    case 'build-nodejs-src-app':
      {
        const toOptions = { deployId: process.argv[3], clientId: process.argv[4] };
        const fromOptions = { deployId: process.argv[5], clientId: process.argv[6] };
        buildClientSrc({ toOptions, fromOptions });
      }
      break;
    case 'build-nodejs-conf-api':
      {
        const toOptions = { apiId: process.argv[3], deployId: process.argv[4], clientId: process.argv[5] };
        const fromOptions = { apiId: process.argv[6], deployId: process.argv[7], clientId: process.argv[8] };
        addApiConf({ toOptions, fromOptions });
      }
      break;
    case 'build-nodejs-src-api':
      {
        const toOptions = { apiId: process.argv[3], deployId: process.argv[4], clientId: process.argv[5] };
        const fromOptions = { apiId: process.argv[6], deployId: process.argv[7], clientId: process.argv[8] };
        buildApiSrc({ toOptions, fromOptions });
      }
      break;
    case 'build-nodejs-conf-ws':
      {
        const toOptions = {
          wsId: process.argv[3],
          deployId: process.argv[4],
          host: process.argv[5],
          paths: process.argv[6],
        };
        const fromOptions = {
          wsId: process.argv[7],
          deployId: process.argv[8],
          host: process.argv[9],
          paths: process.argv[10],
        };
        addWsConf({ toOptions, fromOptions });
      }
      break;
    case 'build-nodejs-src-ws':
      {
        const toOptions = {
          wsId: process.argv[3],
          deployId: process.argv[4],
          host: process.argv[5],
          paths: process.argv[6],
        };
        const fromOptions = {
          wsId: process.argv[7],
          deployId: process.argv[8],
          host: process.argv[9],
          paths: process.argv[10],
        };
        buildWsSrc({ toOptions, fromOptions });
      }
      break;
    case 'conf': {
      loadConf(process.argv[3], process.argv[4]);
      break;
    }

    case 'new-nodejs-app':
      {
        const deployId = process.argv[3];
        const clientId = process.argv[4];

        shellExec(`node bin/deploy build-nodejs-conf-app ${deployId} ${clientId}`);

        shellExec(`node bin/deploy build-nodejs-src-app ${deployId} ${clientId}`);

        shellExec(`node bin/deploy build-full-client ${deployId}`);

        shellExec(`npm run dev ${deployId}`);
      }
      break;
    case 'test-new-api':
      {
        const port = process.argv[3];
        const apiId = process.argv[4];
        let url = `http://localhost:${port}/api/${apiId}`;
        {
          logger.info(`POST REQUEST`, url);
          const result = await axios.post(url, {});
          url += '/' + result.data.data._id;
          logger.info(`POST RESULT ${url}`, result.data);
        }
        {
          logger.info(`GET REQUEST`, url);
          const result = await axios.get(url);
          logger.info(`GET RESULT ${url}`, result.data);
        }
        {
          logger.info(`DELETE REQUEST`, url);
          const result = await axios.delete(url);
          logger.info(`DELETE RESULT ${url}`, result.data);
        }
      }
      break;
    case 'new-nodejs-api':
      {
        const apiId = process.argv[3];
        const deployId = process.argv[4];
        const clientId = process.argv[5];

        shellExec(`node bin/deploy build-nodejs-conf-api ${apiId} ${deployId} ${clientId}`);

        shellExec(`node bin/deploy build-nodejs-src-api ${apiId} ${deployId} ${clientId}`);

        // shellExec(`npm run dev ${deployId}`);
      }
      break;
    case 'new-nodejs-ws':
      {
        const wsId = process.argv[3];
        const deployId = process.argv[4];
        const host = process.argv[5];
        const paths = process.argv[6];

        shellExec(`node bin/deploy build-nodejs-conf-ws ${wsId} ${deployId} ${host} ${paths}`);

        shellExec(`node bin/deploy build-nodejs-src-ws ${wsId} ${deployId} ${host} ${paths}`);

        shellExec(`npm run dev ${deployId}`);
      }
      break;
    case 'build-full-client':
      {
        dotenv.config({ override: true });
        if (!process.argv[3]) process.argv[3] = 'default';
        const { deployId, folder } = loadConf(process.argv[3]);

        let argHost = process.argv[4] ? process.argv[4].split(',') : [];
        let argPath = process.argv[5] ? process.argv[5].split(',') : [];
        let deployIdSingleReplicas = [];
        const serverConf = deployId
          ? JSON.parse(fs.readFileSync(`./conf/conf.server.json`, 'utf8'))
          : Config.default.server;
        for (const host of Object.keys(serverConf)) {
          for (const path of Object.keys(serverConf[host])) {
            if (argHost.length && argPath.length && (!argHost.includes(host) || !argPath.includes(path))) {
              delete serverConf[host][path];
            } else {
              serverConf[host][path].liteBuild = process.argv.includes('l') ? true : false;
              serverConf[host][path].minifyBuild = process.env.NODE_ENV === 'production' ? true : false;
              if (process.env.NODE_ENV === 'development' && process.argv.includes('static')) {
                serverConf[host][path].apiBaseProxyPath = '/';
                serverConf[host][path].apiBaseHost = `localhost:${parseInt(process.env.PORT) + 1}`;
              }
              if (serverConf[host][path].singleReplica && serverConf[host][path].replicas) {
                deployIdSingleReplicas = deployIdSingleReplicas.concat(
                  serverConf[host][path].replicas.map((replica) => buildReplicaId({ deployId, replica })),
                );

                // shellExec(Cmd.replica(deployId, host, path));
              }
            }
          }
        }
        fs.writeFileSync(`./conf/conf.server.json`, JSON.stringify(serverConf, null, 4), 'utf-8');
        await buildClient();

        for (const replicaDeployId of deployIdSingleReplicas) {
          shellExec(Cmd.conf(replicaDeployId, process.env.NODE_ENV));
          shellExec(Cmd.build(replicaDeployId));
        }
      }
      break;

    case 'xampp': {
      const directory = 'c:/xampp/htdocs';
      const host = 'localhost';
      const port = 80;
      Xampp.removeRouter();
      Xampp.appendRouter(`  Listen ${port} 
               <VirtualHost *:${port}>
                DocumentRoot "${directory}"
                ServerName ${host}:${port}
      
                <Directory "${directory}">
                  Options Indexes FollowSymLinks MultiViews
                  AllowOverride All
                  Require all granted
                </Directory>
      
              </VirtualHost>
              `);
      if (Xampp.enabled() && Xampp.router) Xampp.initService({ daemon: true });
      break;
    }

    case 'adminer': {
      const directory = '/home/dd/engine/public/adminer';
      // const host = '127.0.0.1';
      const host = 'localhost';
      const port = 80;
      if (!process.argv.includes('server')) {
        if (fs.existsSync(directory)) fs.removeSync(directory);
        fs.mkdirSync(directory, { recursive: true });
        shellExec(`cd ${directory} && wget https://www.adminer.org/latest.php -O adminer.php`);
      }
      Lampp.removeRouter();
      Lampp.appendRouter(`  Listen ${port} 
         <VirtualHost *:${port}>
          DocumentRoot "${directory}"
          ServerName ${host}:${port}

          <Directory "${directory}">
            Options Indexes FollowSymLinks MultiViews
            AllowOverride All
            Require all granted
          </Directory>

        </VirtualHost>
        `);
      if (Lampp.enabled() && Lampp.router) Lampp.initService({ daemon: true });
      shellExec(`open /opt/lampp/apache2/conf/httpd.conf`);
      break;
    }

    case 'pma':
      {
        const directory = '/home/dd/engine/public/phpmyadmin';
        // const host = '127.0.0.1';
        const host = 'localhost';
        const port = 80;
        // data config path: /etc/phpmyadmin

        // The config.inc.php file is not required, and only needed for custom configurations

        // phpmyadmin will first refer to ./libraries/config.default.php to retrieve the default values.

        // If for some reason you need to modify the default values, and the ./config.inc.php
        // file doesn't exist, you will need to create one as per the Installation documentation.

        // You will also need to configure pmadb for some of phpmyadmin's special features such as bookmarks.

        // CREATE USER 'pma'@'localhost' IDENTIFIED VIA mysql_native_password USING 'pmapass';
        // GRANT SELECT, INSERT, UPDATE, DELETE ON `<pma_db>`.* TO 'pma'@'localhost';

        if (!process.argv.includes('server')) {
          // if (fs.existsSync(directory)) fs.removeSync(directory);
          shellExec(`sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl`);
          shellExec(`sudo phpenmod mbstring`);
          shellExec(
            `cd /usr/share/phpmyadmin && git init && git add . && git commit -m "Base phpMyAdmin implementation"`,
          );
        }

        // if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
        // if (!fs.existsSync('./public/phpmyadmin/phpmyadmin'))
        //   fs.copySync('/usr/share/phpmyadmin', './public/phpmyadmin/phpmyadmin');

        Lampp.removeRouter();
        Lampp.appendRouter(`  Listen ${port} `);
        if (Lampp.enabled() && Lampp.router) Lampp.initService({ daemon: true });
        // shellExec(`open /opt/lampp/apache2/conf/httpd.conf`);

        // Create a link in /var/www like this:

        // sudo ln -s /usr/share/phpmyadmin /var/www/

        // Note: since 14.04 you may want to use /var/www/html/ instead of /var/www/

        // If that's not working for you, you need to include PHPMyAdmin inside apache configuration.

        // Open apache.conf using your favorite editor, mine is vim :)

        // sudo vim /etc/apache2/apache2.conf

        // Then add the following line:

        // Include /etc/phpmyadmin/apache.conf

        // For Ubuntu 15.04 and 16.04

        // sudo ln -s /etc/phpmyadmin/apache.conf /etc/apache2/conf-available/phpmyadmin.conf
        // sudo a2enconf phpmyadmin.conf
        // sudo service apache2 reload
        break;
        Lampp.appendRouter(`   Listen ${port}

        <VirtualHost *:${port}>
            DocumentRoot "${directory}"
            ServerName ${host}:${port}

            <Directory "${directory}">
              Options Indexes FollowSymLinks MultiViews
              AllowOverride All
              Require all granted
            </Directory>

          </VirtualHost>`);
        // phpMyAdmin default Apache configuration:
        Lampp.appendRouter(`

          Listen ${port}

          Alias /phpmyadmin /usr/share/phpmyadmin

<Directory /usr/share/phpmyadmin>
    Options Indexes FollowSymLinks
    DirectoryIndex index.php

    <IfModule mod_php5.c>
        AddType application/x-httpd-php .php

        php_flag magic_quotes_gpc Off
        php_flag track_vars On
        php_flag register_globals Off
        php_value include_path .
    </IfModule>

</Directory>

# Authorize for setup
<Directory /usr/share/phpmyadmin/setup>
    <IfModule mod_authn_file.c>
    AuthType Basic
    AuthName "phpMyAdmin Setup"
    AuthUserFile /etc/phpmyadmin/htpasswd.setup
    </IfModule>
    Require valid-user
</Directory>

# Disallow web access to directories that don't need it
<Directory /usr/share/phpmyadmin/libraries>
    Order Deny,Allow
    Deny from All
</Directory>
<Directory /usr/share/phpmyadmin/setup/lib>
    Order Deny,Allow
    Deny from All
</Directory>

          `);
      }
      break;

    case 'update-dependencies':
      const files = await fs.readdir(`./engine-private/conf`, { recursive: true });
      const originPackage = JSON.parse(fs.readFileSync(`./package.json`, 'utf8'));
      for (const relativePath of files) {
        const filePah = `./engine-private/conf/${relativePath.replaceAll(`\\`, '/')}`;
        if (filePah.split('/').pop() === 'package.json') {
          const deployPackage = JSON.parse(fs.readFileSync(filePah), 'utf8');
          deployPackage.dependencies = originPackage.dependencies;
          deployPackage.devDependencies = originPackage.devDependencies;
          fs.writeFileSync(filePah, JSON.stringify(deployPackage, null, 4), 'utf8');
        }
      }
      break;

    case 'run-macro':
      {
        if (fs.existsSync(`./tmp/await-deploy`)) fs.remove(`./tmp/await-deploy`);
        const dataDeploy = getDataDeploy({
          deployGroupId: process.argv[3],
          buildSingleReplica: true,
          deployIdConcat: ['dd-proxy', 'dd-cron'],
        });
        if (!process.argv[4]) await setUpProxyMaintenanceServer({ deployGroupId: process.argv[3] });
        await deployRun(process.argv[4] ? dataDeploy.filter((d) => d.deployId.match(process.argv[4])) : dataDeploy);
      }
      break;

    case 'build-macro':
      {
        const dataDeploy = getDataDeploy({ deployGroupId: process.argv[3], buildSingleReplica: true });
        for (const deploy of dataDeploy) {
          if (!process.argv[4] || (process.argv[4] && process.argv[4] === deploy.deployId)) {
            shellExec(Cmd.conf(deploy.deployId));
            shellExec(Cmd.build(deploy.deployId));
          }
        }
      }
      break;
    case 'macro': {
      shellExec(`git checkout .`);
      shellExec(`node bin/deploy build-macro ${process.argv.slice(3).join(' ')}`);
      shellExec(`git checkout .`);
      shellExec(`node bin/deploy run-macro ${process.argv.slice(3).join(' ')}`);
      break;
    }

    case 'keep-server': {
      await setUpProxyMaintenanceServer({ deployGroupId: process.argv[3] });
      break;
    }
    case 'prometheus':
    case 'prom':
      {
        const rangePort = [1, 20];
        const promConfigPath = `./engine-private/prometheus/prometheus-service-config.yml`;
        const rawConfig = fs
          .readFileSync(promConfigPath, 'utf8')
          .replaceAll(
            `['']`,
            JSON.stringify(range(...rangePort).map((i) => `host.docker.internal:30${setPad(i, '0', 2)}`)).replaceAll(
              `"`,
              `'`,
            ),
          );
        console.log(rawConfig);

        fs.writeFileSync(promConfigPath, rawConfig, 'utf8');

        shellExec(`docker-compose -f engine-private/prometheus/prometheus-service.yml up -d`);
      }
      break;

    case 'sync-env-port':
      const dataDeploy = getDataDeploy({ deployGroupId: process.argv[3], disableSyncEnvPort: true });
      const dataEnv = [
        { env: 'production', port: 3000 },
        { env: 'development', port: 4000 },
        { env: 'test', port: 5000 },
      ];
      let port = 0;
      const singleReplicaHosts = [];
      for (const deployIdObj of dataDeploy) {
        const { deployId, replicaHost } = deployIdObj;
        if (replicaHost && !singleReplicaHosts.includes(replicaHost)) singleReplicaHosts.push(replicaHost);
        const proxyInstance = deployId.match('proxy') || deployId.match('cron');
        const baseConfPath = fs.existsSync(`./engine-private/replica/${deployId}`)
          ? `./engine-private/replica`
          : `./engine-private/conf`;
        for (const envInstanceObj of dataEnv) {
          const envPath = `${baseConfPath}/${deployId}/.env.${envInstanceObj.env}`;
          const envObj = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
          envObj.PORT = proxyInstance
            ? envInstanceObj.port
            : envInstanceObj.port + port - singleReplicaHosts.length - (replicaHost ? 1 : 0);

          writeEnv(envPath, envObj);
        }
        const serverConf = loadReplicas(
          JSON.parse(fs.readFileSync(`${baseConfPath}/${deployId}/conf.server.json`, 'utf8')),
        );
        if (!proxyInstance) for (const host of Object.keys(serverConf)) port += Object.keys(serverConf[host]).length;
      }
      break;
    case 'uml':
      {
        shellExec(`node bin/deploy fix-uml ${process.argv.slice(3).join(' ')}`);
        shellExec(`node bin/deploy build-uml ${process.argv.slice(3).join(' ')}`);
      }
      break;

    case 'fix-uml': {
      // required: java jdk-11.0.1

      // comment:
      // '--add-opens=java.xml/com.sun.org.apache.xalan.internal.xsltc.trax="ALL-UNNAMED"'
      // in plantuml.js src

      // const deployId = process.argv[3];
      // const clientId = process.argv[4];
      // const folder = `./src/client/public/${clientId ? clientId : 'default'}/docs/plantuml`;
      // const privateConfFolder = `./engine-private/conf/${deployId}`;
      // const confData = !deployId
      //   ? Config.default
      //   : {
      //       client: JSON.parse(fs.readFileSync(`${privateConfFolder}/conf.client.json`, 'utf8')),
      //       ssr: JSON.parse(fs.readFileSync(`${privateConfFolder}/conf.ssr.json`, 'utf8')),
      //       server: JSON.parse(fs.readFileSync(`${privateConfFolder}/conf.server.json`, 'utf8')),
      //       cron: JSON.parse(fs.readFileSync(`${privateConfFolder}/conf.cron.json`, 'utf8')),
      //     };

      fs.writeFileSync(
        `./node_modules/plantuml/lib/plantuml.js`,
        fs
          .readFileSync(`./node_modules/plantuml/lib/plantuml.js`, 'utf8')
          .replace(`'--add-opens=java.xml/com.sun.org.apache.xalan.internal.xsltc.trax="ALL-UNNAMED"'`, `//`),
      );
    }
    case 'build-uml':
      {
        const plantuml = await import('plantuml');
        const folder = process.argv[3] ? process.argv[3] : `./src/client/public/default/plantuml`;
        const confData = Config.default;

        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

        for (const typeConf of Object.keys(confData)) {
          logger.info(`generate ${typeConf} instance`);
          try {
            const svg = await plantuml(`
              @startjson
                ${JSON.stringify(confData[typeConf])}
              @endjson
            `);
            fs.writeFileSync(`${folder}/${typeConf}-conf.svg`, svg);
          } catch (error) {
            logger.error(error, error.stack);
          }
          logger.info(`generate ${typeConf} schema`);
          try {
            const svg = await plantuml(`
            @startjson
              ${JSON.stringify(ejs(confData[typeConf]))}
            @endjson
          `);
            fs.writeFileSync(`${folder}/${typeConf}-schema.svg`, svg);
          } catch (error) {
            logger.error(error, error.stack);
          }
        }
      }
      break;

    case 'build-single-replica': {
      const deployId = process.argv[3];
      const host = process.argv[4];
      const path = process.argv[5];
      const serverConf = loadReplicas(
        JSON.parse(fs.readFileSync(`./engine-private/conf/${deployId}/conf.server.json`, 'utf8')),
      );

      if (serverConf[host][path].replicas) {
        {
          let replicaIndex = -1;
          for (const replica of serverConf[host][path].replicas) {
            replicaIndex++;
            const replicaDeployId = `${deployId}-${serverConf[host][path].replicas[replicaIndex].slice(1)}`;
            // fs.mkdirSync(`./engine-private/replica/${deployId}${replicaIndex}`, { recursive: true });
            await fs.copy(`./engine-private/conf/${deployId}`, `./engine-private/replica/${replicaDeployId}`);
            fs.writeFileSync(
              `./engine-private/replica/${replicaDeployId}/package.json`,
              fs
                .readFileSync(`./engine-private/replica/${replicaDeployId}/package.json`, 'utf8')
                .replaceAll(`${deployId}`, `${replicaDeployId}`),
              'utf8',
            );
          }
        }
        {
          let replicaIndex = -1;
          for (const replica of serverConf[host][path].replicas) {
            replicaIndex++;
            const replicaDeployId = `${deployId}-${serverConf[host][path].replicas[replicaIndex].slice(1)}`;
            let replicaServerConf = JSON.parse(
              fs.readFileSync(`./engine-private/replica/${replicaDeployId}/conf.server.json`, 'utf8'),
            );

            const singleReplicaConf = replicaServerConf[host][path];
            singleReplicaConf.replicas = undefined;
            singleReplicaConf.singleReplica = undefined;

            replicaServerConf = {};
            replicaServerConf[host] = {};
            replicaServerConf[host][replica] = singleReplicaConf;

            fs.writeFileSync(
              `./engine-private/replica/${replicaDeployId}/conf.server.json`,
              JSON.stringify(replicaServerConf, null, 4),
              'utf8',
            );
          }
        }
      }
      break;
    }
    case 'build-macro-replica':
      getDataDeploy({ deployGroupId: process.argv[3], buildSingleReplica: true });
      break;

    case 'rename-package': {
      const name = process.argv[3];
      const originPackage = JSON.parse(fs.readFileSync(`./package.json`, 'utf8'));
      originPackage.name = name;
      fs.writeFileSync(`./package.json`, JSON.stringify(originPackage, null, 4), 'utf8');

      const originPackageLockJson = JSON.parse(fs.readFileSync(`./package-lock.json`, 'utf8'));
      originPackageLockJson.name = name;
      originPackageLockJson.packages[''].name = name;
      fs.writeFileSync(`./package-lock.json`, JSON.stringify(originPackageLockJson, null, 4), 'utf8');

      break;
    }

    case 'set-repo': {
      const originPackage = JSON.parse(fs.readFileSync(`./package.json`, 'utf8'));
      originPackage.repository = {
        type: 'git',
        url: `git+https://github.com/${process.argv[3]}.git`,
      };
      fs.writeFileSync(`./package.json`, JSON.stringify(originPackage, null, 4), 'utf8');

      break;
    }

    case 'version-build': {
      const originPackageJson = JSON.parse(fs.readFileSync(`package.json`, 'utf8'));
      const newVersion = process.argv[3] ?? originPackageJson.version;
      const { version } = originPackageJson;
      originPackageJson.version = newVersion;
      fs.writeFileSync(`package.json`, JSON.stringify(originPackageJson, null, 4), 'utf8');

      const originPackageLockJson = JSON.parse(fs.readFileSync(`package-lock.json`, 'utf8'));
      originPackageLockJson.version = newVersion;
      originPackageLockJson.packages[''].version = newVersion;
      fs.writeFileSync(`package-lock.json`, JSON.stringify(originPackageLockJson, null, 4), 'utf8');

      if (fs.existsSync(`./engine-private/conf`)) {
        const files = await fs.readdir(`./engine-private/conf`, { recursive: true });
        for (const relativePath of files) {
          const filePah = `./engine-private/conf/${relativePath.replaceAll(`\\`, '/')}`;
          if (filePah.split('/').pop() === 'package.json') {
            const originPackage = JSON.parse(fs.readFileSync(filePah, 'utf8'));
            originPackage.version = newVersion;
            fs.writeFileSync(filePah, JSON.stringify(originPackage, null, 4), 'utf8');
          }
          if (filePah.split('/').pop() === 'deployment.yaml') {
            fs.writeFileSync(
              filePah,
              fs
                .readFileSync(filePah, 'utf8')
                .replaceAll(`v${version}`, `v${newVersion}`)
                .replaceAll(`engine.version: ${version}`, `engine.version: ${newVersion}`),
              'utf8',
            );
          }
        }
      }

      fs.writeFileSync(
        `./docker-compose.yml`,
        fs
          .readFileSync(`./docker-compose.yml`, 'utf8')
          .replaceAll(`engine.version: '${version}'`, `engine.version: '${newVersion}'`),
        'utf8',
      );
      fs.writeFileSync(
        `./manifests/deployment/dd-template-development/deployment.yaml`,
        fs
          .readFileSync(`./manifests/deployment/dd-template-development/deployment.yaml`, 'utf8')
          .replaceAll(`underpost:v${version}`, `underpost:v${newVersion}`),
        'utf8',
      );

      if (fs.existsSync(`./.github/workflows/docker-image.yml`))
        fs.writeFileSync(
          `./.github/workflows/docker-image.yml`,
          fs
            .readFileSync(`./.github/workflows/docker-image.yml`, 'utf8')
            .replaceAll(`underpost-engine:v${version}`, `underpost-engine:v${newVersion}`),
          'utf8',
        );

      fs.writeFileSync(
        `./src/index.js`,
        fs.readFileSync(`./src/index.js`, 'utf8').replaceAll(`${version}`, `${newVersion}`),
        'utf8',
      );
      shellExec(`node bin/deploy cli-docs ${version} ${newVersion}`);
      shellExec(`node bin/deploy update-dependencies`);
      shellExec(`auto-changelog`);
      shellExec(`node bin/build dd`);
      shellExec(`node bin deploy --kubeadm --build-manifest --sync --info-router --replicas 1 dd`);
      shellExec(`node bin deploy --kubeadm --build-manifest --sync --info-router --replicas 1 dd production`);
      break;
    }

    case 'version-deploy': {
      shellExec(
        `underpost secret underpost --create-from-file /home/dd/engine/engine-private/conf/dd-cron/.env.production`,
      );
      shellExec(`node bin/build dd conf`);
      shellExec(`git add . && cd ./engine-private && git add .`);
      shellExec(`node bin cmt . ci package-pwa-microservices-template`);
      shellExec(`node bin cmt ./engine-private ci package-pwa-microservices-template`);
      shellExec(`node bin push . underpostnet/engine`);
      shellExec(`cd ./engine-private && node ../bin push . underpostnet/engine-private`);
      break;
    }

    case 'update-authors': {
      // #### Ordered by first contribution.
      fs.writeFileSync(
        './AUTHORS.md',
        `# Authors


${shellExec(`git log | grep Author: | sort -u`, { stdout: true }).split(`\n`).join(`\n\n\n`)}

#### Generated by [underpost.net](https://underpost.net)`,
        'utf8',
      );

      break;
    }

    case 'restore-macro-db':
      {
        const deployGroupId = process.argv[3];
        const deployId = process.argv[4];
        await restoreMacroDb(deployGroupId, deployId);
      }

      break;

    case 'mongo': {
      await MongooseDB.server();
      break;
    }

    case 'lampp': {
      await Lampp.install();
      break;
    }

    case 'heb': {
      // https://besu.hyperledger.org/
      // https://github.com/hyperledger/besu/archive/refs/tags/24.9.1.tar.gz

      switch (process.platform) {
        case 'linux':
          {
            shellCd(`..`);

            // Download the Linux binary
            shellExec(`wget https://github.com/hyperledger/besu/releases/download/24.9.1/besu-24.9.1.tar.gz`);

            // Unzip the file:
            shellExec(`tar -xvzf besu-24.9.1.tar.gz`);

            shellCd(`besu-24.9.1`);

            shellExec(`bin/besu --help`);

            // Set env path
            // export PATH=$PATH:/home/dd/besu-24.9.1/bin

            // Open src
            // shellExec(`sudo code /home/dd/besu-24.9.1 --user-data-dir="/root/.vscode-root" --no-sandbox`);
          }

          break;

        default:
          break;
      }

      break;
    }

    case 'fix-deps': {
      await fixDependencies();
      break;
    }

    case 'update-default-conf': {
      const defaultServer = DefaultConf.server['default.net']['/'];
      let confName = process.argv[3];
      if (confName === 'ghpkg') {
        confName = undefined;
        const host = 'underpostnet.github.io';
        const path = '/pwa-microservices-template-ghpkg';
        DefaultConf.server = {
          [host]: { [path]: defaultServer },
        };
        DefaultConf.server[host][path].apiBaseProxyPath = '/';
        DefaultConf.server[host][path].apiBaseHost = 'www.nexodev.org';
      } else if (confName === 'template') {
        const host = 'default.net';
        const path = '/';
        DefaultConf.server[host][path].valkey = {
          port: 6379,
          host: 'valkey-service.default.svc.cluster.local',
        };
        // mongodb-0.mongodb-service
        DefaultConf.server[host][path].db.host = 'mongodb://mongodb-service:27017';
        confName = '';
      } else if (confName) {
        DefaultConf.client = JSON.parse(fs.readFileSync(`./engine-private/conf/${confName}/conf.client.json`, 'utf8'));
        DefaultConf.server = JSON.parse(fs.readFileSync(`./engine-private/conf/${confName}/conf.server.json`, 'utf8'));
        DefaultConf.ssr = JSON.parse(fs.readFileSync(`./engine-private/conf/${confName}/conf.ssr.json`, 'utf8'));
        // DefaultConf.cron = JSON.parse(fs.readFileSync(`./engine-private/conf/${confName}/conf.cron.json`, 'utf8'));

        for (const host of Object.keys(DefaultConf.server)) {
          for (const path of Object.keys(DefaultConf.server[host])) {
            DefaultConf.server[host][path].db = defaultServer.db;
            DefaultConf.server[host][path].mailer = defaultServer.mailer;

            delete DefaultConf.server[host][path]._wp_client;
            delete DefaultConf.server[host][path]._wp_git;
            delete DefaultConf.server[host][path]._wp_directory;
            delete DefaultConf.server[host][path].wp;
            delete DefaultConf.server[host][path].git;
            delete DefaultConf.server[host][path].directory;
          }
        }
      }
      const sepRender = '/**/';
      const confRawPaths = fs.readFileSync('./conf.js', 'utf8').split(sepRender);
      confRawPaths[1] = `${JSON.stringify(DefaultConf)};`;
      const targetConfPath = `./conf${confName ? `.${confName}` : ''}.js`;
      fs.writeFileSync(targetConfPath, confRawPaths.join(sepRender), 'utf8');
      shellExec(`prettier --write ${targetConfPath}`);

      break;
    }

    case 'ssh': {
      const host = process.argv[3] ?? `root@${await ip.public.ipv4()}`;
      const domain = host.split('@')[1];
      const user = 'root'; // host.split('@')[0];
      const password = process.argv[4] ?? '';
      const port = 22;

      const setUpSSH = () => {
        // Required port forwarding mapping
        // ssh	TCP	2222	22	<local-server-ip>
        // ssh	UDP	2222	22	<local-server-ip>

        // Remote connect via public key
        // ssh -i <key-path> <user>@<host>:2222

        shellExec(`cat ./engine-private/deploy/id_rsa.pub > ~/.ssh/authorized_keys`);

        // local trust on first use validator
        // check ~/.ssh/known_hosts

        // shellExec(`sudo sed -i -e "s@#PasswordAuthentication yes@PasswordAuthentication no@g" /etc/ssh/sshd_config`);
        // shellExec(`sudo sed -i -e "s@#UsePAM no@UsePAM yes@g" /etc/ssh/sshd_config`);

        // Include /etc/ssh/sshd_config.d/*.conf
        // sudo tee /etc/ssh/sshd_config.d/99-custom.conf
        shellExec(`sudo tee /etc/ssh/sshd_config <<EOF
PasswordAuthentication	no
ChallengeResponseAuthentication	yes
UsePAM	yes
PubkeyAuthentication	Yes
RSAAuthentication	Yes
PermitRootLogin	Yes
X11Forwarding	yes
X11DisplayOffset	10
LoginGraceTime	120
StrictModes	yes
SyslogFacility	AUTH
LogLevel	INFO
#HostKey	/etc/ssh/ssh_host_ecdsa_key
HostKey	/etc/ssh/ssh_host_ed25519_key
#HostKey	/etc/ssh/ssh_host_rsa_key
AuthorizedKeysFile	~/.ssh/authorized_keys
Subsystem	sftp	/usr/libexec/openssh/sftp-server
ListenAddress 0.0.0.0
ListenAddress ::
ListenAddress ${domain}
ListenAddress ${domain}:22
EOF`);

        shellExec(`sudo chmod 700 ~/.ssh/`);
        shellExec(`sudo chmod 600 ~/.ssh/authorized_keys`);
        shellExec(`sudo chmod 644 ~/.ssh/known_hosts`);
        shellExec(`sudo chmod 600 ~/.ssh/id_rsa`);
        shellExec(`sudo chmod 600 /etc/ssh/ssh_host_ed25519_key`);
        shellExec(`chown -R ${user}:${user} ~/.ssh`);

        shellExec(`ufw allow ${port}/tcp`);
        shellExec(`ufw allow ${port}/udp`);
        shellExec(`ufw allow ssh`);
        shellExec(`ufw allow from 192.168.0.0/16 to any port 22`);

        // active ssh-agent
        shellExec('eval `ssh-agent -s`' + ` && ssh-add ~/.ssh/id_rsa` + ` && ssh-add -l`);
        // remove all
        // shellExec(`ssh-add -D`);
        // remove single
        // shellExec(`ssh-add -d ~/.ssh/id_rsa`);

        // shellExec(`echo "@${host.split(`@`)[1]} * $(cat ~/.ssh/id_rsa.pub)" > ~/.ssh/known_hosts`);
        shellExec('eval `ssh-agent -s`' + `&& ssh-keyscan -H -t ed25519 ${host.split(`@`)[1]} > ~/.ssh/known_hosts`);
        // shellExec(`sudo echo "" > ~/.ssh/known_hosts`);

        // ssh-copy-id -i ~/.ssh/id_rsa.pub -p <port_number> <username>@<host>
        shellExec(`ssh-copy-id -i ~/.ssh/id_rsa.pub -p ${port} ${host}`);
        // debug:
        // shellExec(`ssh -vvv ${host}`);

        shellExec(`sudo cp ./engine-private/deploy/id_rsa ~/.ssh/id_rsa`);
        shellExec(`sudo cp ./engine-private/deploy/id_rsa.pub ~/.ssh/id_rsa.pub`);

        shellExec(`sudo echo "" > /etc/ssh/ssh_host_ecdsa_key`);
        shellExec(`sudo cp ./engine-private/deploy/id_rsa /etc/ssh/ssh_host_ed25519_key`);
        shellExec(`sudo echo "" > /etc/ssh/ssh_host_rsa_key`);

        shellExec(`sudo echo "" > /etc/ssh/ssh_host_ecdsa_key.pub`);
        shellExec(`sudo cp ./engine-private/deploy/id_rsa.pub /etc/ssh/ssh_host_ed25519_key.pub`);
        shellExec(`sudo echo "" > /etc/ssh/ssh_host_rsa_key.pub`);

        shellExec(`sudo systemctl enable sshd`);
        shellExec(`sudo systemctl restart sshd`);

        const status = shellExec(`sudo systemctl status sshd`, { silent: true, stdout: true });
        console.log(
          status.match('running') ? status.replaceAll(`running`, `running`.green) : `ssh service not running`.red,
        );
      };

      if (process.argv.includes('import')) {
        setUpSSH();
        break;
      }

      shellExec(`sudo rm -rf ./id_rsa`);
      shellExec(`sudo rm -rf ./id_rsa.pub`);

      if (process.argv.includes('legacy'))
        shellExec(`ssh-keygen -t rsa -b 4096 -f id_rsa -N "${password}" -q -C "${host}"`);
      else shellExec(`ssh-keygen -t ed25519 -f id_rsa -N "${password}" -q -C "${host}"`);

      shellExec(`sudo cp ./id_rsa ~/.ssh/id_rsa`);
      shellExec(`sudo cp ./id_rsa.pub ~/.ssh/id_rsa.pub`);

      shellExec(`sudo cp ./id_rsa ./engine-private/deploy/id_rsa`);
      shellExec(`sudo cp ./id_rsa.pub ./engine-private/deploy/id_rsa.pub`);

      shellExec(`sudo rm -rf ./id_rsa`);
      shellExec(`sudo rm -rf ./id_rsa.pub`);
      setUpSSH();
      break;
    }

    case 'maas-db': {
      // DROP, ALTER, CREATE, WITH ENCRYPTED
      // sudo -u <user> -h <host> psql <db-name>
      shellExec(`DB_PG_MAAS_NAME=${process.env.DB_PG_MAAS_NAME}`);
      shellExec(`DB_PG_MAAS_PASS=${process.env.DB_PG_MAAS_PASS}`);
      shellExec(`DB_PG_MAAS_USER=${process.env.DB_PG_MAAS_USER}`);
      shellExec(`DB_PG_MAAS_HOST=${process.env.DB_PG_MAAS_HOST}`);
      shellExec(
        `sudo -i -u postgres psql -c "CREATE USER \"$DB_PG_MAAS_USER\" WITH ENCRYPTED PASSWORD '$DB_PG_MAAS_PASS'"`,
      );
      shellExec(
        `sudo -i -u postgres psql -c "ALTER USER \"$DB_PG_MAAS_USER\" WITH ENCRYPTED PASSWORD '$DB_PG_MAAS_PASS'"`,
      );
      const actions = ['LOGIN', 'SUPERUSER', 'INHERIT', 'CREATEDB', 'CREATEROLE', 'REPLICATION'];
      shellExec(`sudo -i -u postgres psql -c "ALTER USER \"$DB_PG_MAAS_USER\" WITH ${actions.join(' ')}"`);
      shellExec(`sudo -i -u postgres psql -c "\\du"`);

      shellExec(`sudo -i -u postgres createdb -O "$DB_PG_MAAS_USER" "$DB_PG_MAAS_NAME"`);

      shellExec(`sudo -i -u postgres psql -c "\\l"`);
      break;
    }

    case 'valkey': {
      if (!process.argv.includes('server')) {
        if (process.argv.includes('rocky')) {
          // shellExec(`yum install -y https://repo.percona.com/yum/percona-release-latest.noarch.rpm`);
          // shellExec(`sudo percona-release enable valkey experimental`);
          shellExec(`sudo dnf install valkey`);
          shellExec(`chown -R valkey:valkey /etc/valkey`);
          shellExec(`chown -R valkey:valkey /var/lib/valkey`);
          shellExec(`chown -R valkey:valkey /var/log/valkey`);
          shellExec(`sudo systemctl enable valkey.service`);
          shellExec(`sudo systemctl start valkey`);
          shellExec(`valkey-cli ping`);
        } else {
          shellExec(`cd /home/dd && git clone https://github.com/valkey-io/valkey.git`);
          shellExec(`cd /home/dd/valkey && make`);
          shellExec(`apt install valkey-tools`); // valkey-cli
        }
      }
      if (process.argv.includes('rocky')) {
        shellExec(`sudo systemctl stop valkey`);
        shellExec(`sudo systemctl start valkey`);
      } else shellExec(`cd /home/dd/valkey && ./src/valkey-server`);

      break;
    }

    case 'valkey-service': {
      shellExec(`pm2 start bin/deploy.js --node-args=\"--max-old-space-size=8192\" --name valkey -- valkey server`);
      break;
    }

    case 'update-instances': {
      shellExec(`node bin deploy dd production --sync --build-manifest --info-router --dashboard-update`);
      shellExec(`node bin cron --dashboard-update --init`);
      const deployId = 'dd-core';
      const host = 'www.nexodev.org';
      const path = '/';

      {
        const outputPath = './engine-private/instances';
        if (fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
        const collection = 'instances';
        if (process.argv.includes('export'))
          shellExec(
            `node bin db --export --collections ${collection} --out-path ${outputPath} --hosts ${host} --paths '${path}' ${deployId}`,
          );
        if (process.argv.includes('import'))
          shellExec(
            `node bin db --import --drop --preserveUUID --out-path ${outputPath} --hosts ${host} --paths '${path}' ${deployId}`,
          );
      }
      {
        const outputPath = './engine-private/crons';
        if (fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
        const collection = 'crons';
        if (process.argv.includes('export'))
          shellExec(
            `node bin db --export --collections ${collection} --out-path ${outputPath} --hosts ${host} --paths '${path}' ${deployId}`,
          );
        if (process.argv.includes('import'))
          shellExec(
            `node bin db --import --drop --preserveUUID --out-path ${outputPath} --hosts ${host} --paths '${path}' ${deployId}`,
          );
      }

      break;
    }

    case 'cli-docs': {
      buildCliDoc(program, process.argv[3], process.argv[4]);
      break;
    }

    case 'monitor': {
      shellExec(
        `node bin monitor ${process.argv[6] === 'sync' ? '--sync ' : ''}--type ${process.argv[3]} ${process.argv[4]} ${
          process.argv[5]
        }`,
        {
          async: true,
        },
      );
      break;
    }

    case 'postgresql': {
      if (process.argv.includes('install')) {
        shellExec(`sudo dnf install -y postgresql-server postgresql`);
        shellExec(`sudo postgresql-setup --initdb`);
        shellExec(`chown postgres /var/lib/pgsql/data`);
        shellExec(`sudo systemctl enable postgresql.service`);
        shellExec(`sudo systemctl start postgresql.service`);
      } else {
        shellExec(`sudo systemctl enable postgresql.service`);
        shellExec(`sudo systemctl restart postgresql.service`);
      }

      shellExec(`sudo systemctl status postgresql.service`);

      // sudo systemctl stop postgresql
      // sudo systemctl disable postgresql

      // psql login
      // psql -U <user> -h 127.0.0.1 -W <db-name>

      // gedit /var/lib/pgsql/data/pg_hba.conf
      // host    <db-name>    	<db-user>        <db-host>               md5
      // local   all             postgres                                trust
      // # "local" is for Unix domain socket connections only
      // local   all             all                                     md5
      // # IPv4 local connections:
      // host    all             all             127.0.0.1/32            md5
      // # IPv6 local connections:
      // host    all             all             ::1/128                 md5

      // gedit /var/lib/pgsql/data/postgresql.conf
      // listen_addresses = '*'

      break;
    }

    case 'postgresql-17': {
      if (process.argv.includes('install')) {
        shellExec(`sudo dnf module reset postgresql -y`);
        shellExec(`sudo dnf -qy module disable postgresql`);
        shellExec(
          `sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm`,
        );
        shellExec(`sudo dnf -qy module disable postgresql`);
        shellExec(`sudo dnf install -y postgresql17 postgresql17-server postgresql17-contrib`);

        shellExec(`sudo /usr/pgsql-17/bin/postgresql-17-setup initdb`);
      }
      if (process.argv.includes('uninstall')) {
        shellExec(`sudo systemctl stop postgresql-17`);
        shellExec(`sudo systemctl disable postgresql-17`);

        // Remove PostgreSQL 17 packages and repo
        shellExec(`sudo dnf remove -y postgresql17 postgresql17-server postgresql17-contrib`);
        shellExec(`sudo rpm -e pgdg-redhat-repo-$(rpm -q pgdg-redhat-repo --qf '%{VERSION}-%{RELEASE}') || true`);
        shellExec(`sudo rm -f /etc/yum.repos.d/pgdg-redhat-*.repo`);

        // Clean up data, logs, config, and the postgres user
        shellExec(`sudo rm -rf /var/lib/pgsql/17 /var/log/pgsql`);
        shellExec(`sudo rm -rf /etc/postgresql`);
      } else {
        shellExec(`sudo systemctl enable postgresql-17`);
        shellExec(`sudo systemctl start postgresql-17`);
      }
      break;
    }

    case 'postgresql-14': {
      if (process.argv.includes('install')) {
        shellExec(`sudo dnf module reset postgresql -y`);
        shellExec(`sudo dnf -qy module disable postgresql`);

        shellExec(`sudo systemctl stop postgresql-14`);
        shellExec(`sudo systemctl disable postgresql-14`);

        shellExec(`sudo dnf remove -y postgresql14 postgresql14-server postgresql14-contrib`);
        shellExec(`sudo rm -rf /var/lib/pgsql`);

        shellExec(`sudo dnf install postgresql14 postgresql14-server postgresql14-contrib -y`);
      }
      if (process.argv.includes('uninstall')) {
        shellExec(`sudo systemctl stop postgresql-14`);
        shellExec(`sudo systemctl disable postgresql-14`);
        shellExec(`sudo dnf remove -y postgresql14 postgresql14-server postgresql14-contrib`);
        shellExec(`sudo rm -rf /var/lib/pgsql /var/log/pgsql /etc/postgresql`);
      } else {
        shellExec(`sudo /usr/pgsql-14/bin/postgresql-14-setup initdb`);
        shellExec(`sudo systemctl start postgresql-14`);
        shellExec(`sudo systemctl enable postgresql-14`);
        shellExec(`sudo systemctl status postgresql-14`);
        // sudo dnf install postgresql14-contrib
      }

      break;
    }

    case 'pg-stop': {
      shellExec(`sudo systemctl stop postgresql-14`);
      shellExec(`sudo systemctl disable postgresql-14`);
      break;
    }
    case 'pg-start': {
      shellExec(`sudo systemctl enable postgresql-14`);
      shellExec(`sudo systemctl restart postgresql-14`);
      break;
    }

    case 'pg-list-db': {
      shellExec(`sudo -i -u postgres psql -c "\\l"`);
      break;
    }

    case 'pg-list-table': {
      shellExec(`sudo -i -u postgres psql -c "\\dt *.*"`);
      // schema_name.*
      break;
    }
    case 'pg-drop-db': {
      shellExec(`sudo -i -u postgres psql -c "DROP DATABASE ${process.argv[3]} WITH (FORCE)"`);
      shellExec(`sudo -i -u postgres psql -c "DROP USER ${process.argv[4]}"`);
      break;
    }

    case 'maas-stop': {
      shellExec(`sudo snap stop maas`);
      break;
    }

    case 'nfs': {
      // Daemon RPC  NFSv3. ports:

      // 2049 (TCP/UDP) – nfsd standard port.
      // 111 (TCP/UDP) – rpcbind/portmapper.
      // 20048 (TCP/UDP) – rpc.mountd.
      // 32765 (TCP/UDP) – rpc.statd.
      // 32766 (TCP/UDP) – lockd (NLM).

      // Configure export and permissions:
      // /etc/exports

      // Configure ports:
      // /etc/nfs.conf

      fs.writeFileSync(
        `/etc/nfs.conf`,
        `
[mountd]
port = 20048

[statd]
port = 32765
outgoing-port = 32765

[nfsd]
rdma=y
rdma-port=20049

[lockd]
port = 32766
udp-port = 32766
        `,
        'utf8',
      );

      // Client users have read-only access to resources and are identified as anonymous on the server.
      // /share ip-client(ro,all_squash)

      // Client users can modify resources and keep their UID on the server. Only root is identified as anonymous.
      // /share ip-client(rw)

      // Users on client workstation 1 can modify resources, while those on client workstation 2 have read-only access.
      // UIDs are kept on the server, and only root is identified as anonymous.
      // /share ip-client1(rw) ip-client2(ro)

      // Client1 users can modify resources. Their UID is changed to 1001 and their GID to 100 on the server.
      // /share ip-client(rw,all_squash,anonuid=1001,anongid=100)

      // sudo dnf install nfs-utils
      // sudo systemctl enable --now rpcbind    // RPC map service
      // sudo systemctl enable --now nfs-server // nfs domains nfsd

      // Update exports:
      // shellExec(`sudo exportfs -a -r`);
      // shellExec(`sudo exportfs -v`);

      // Active nfs
      shellExec(`sudo exportfs -s`);

      shellExec(`sudo exportfs -rav`);

      // Rocky enable virt_use_nfs
      // sudo setsebool -P virt_use_nfs 1

      // Disable share:
      // sudo exportfs -u <client-ip>:${process.env.NFS_EXPORT_PATH}/rpi4mb

      // Nfs client:
      // mount -t nfs <server-ip>:/server-mnt /mnt
      // umount /mnt

      shellExec(`sudo systemctl restart nfs-server`);
      break;
    }

    case 'mount': {
      const mounts = shellExec(`mount`).split(`\n`);
      console.table(
        mounts
          .filter((l) => l.trim())
          .map(
            (o) => (
              (o = o.split(' ')),
              {
                path: o[2],
                type: o[4],
                permissions: o[5],
              }
            ),
          ),
      );
      break;
    }

    case 'create-ports': {
      const cmd = [];
      const commissioningDeviceIp = getLocalIPv4Address();
      for (const port of ['5240']) {
        const name = 'maas';
        cmd.push(`${name}:${port}-${port}:${commissioningDeviceIp}`);
      }
      pbcopy(`node engine-private/r create-port ${cmd}`);
      break;
    }

    case 'maas-ports': {
      // Configure firewall:

      // systemctl stop firewalld
      // systemctl mask firewalld

      // ufw disable
      // ufw enable

      // sudo snap install ufw
      // const ports = ['80', '443', '22', '3000-3100'];
      const ports = [
        '43',
        '53',
        '60',
        '66',
        '67',
        '69',
        '4011',
        '111',
        '2049',
        '20048',
        '20049',
        '32765',
        '32766',
        '5248',
        '5240',
      ];
      for (const port of ports) {
        shellExec(`ufw allow ${port}/tcp`);
        shellExec(`ufw allow ${port}/udp`);
      }

      shellExec(`sudo systemctl mask firewalld`);

      break;
    }

    case 'iptables': {
      shellExec(`sudo systemctl enable nftables`);
      shellExec(`sudo systemctl restart nftables`);

      shellExec(`sudo tee /etc/nftables.conf <<EOF
table inet filter {
  chain input {
    type filter hook input priority 0;
    policy drop;
    tcp dport 22 accept
  }
}
EOF`);
      shellExec(`sudo nft -f /etc/nftables.conf`);

      // sudo systemctl stop nftables
      // sudo systemctl disable nftables

      break;
    }

    case 'rpi4': {
      // Rpi4 Run Bootloader:

      // 1) create boot.conf

      // 2) Run lite RPiOs from rpi-imager
      // with boot.conf files in root disk path

      // 3) cd /boot/firmware && sudo rpi-eeprom-config --apply boot.conf

      // 4) sudo reboot

      // 5) check: 'vcgencmd bootloader_version'
      // 6) check: 'vcgencmd bootloader_config'

      // 7) shutdown and restart without sd card

      // sudo apt update
      // sudo apt install git

      break;
    }

    case 'blue': {
      // lsusb | grep blue -i
      // rfkill list
      // sudo service bluetooth start
      // bluetoothctl show
      // sudo rfkill unblock bluetooth
      // dmesg | grep -i bluetooth
      // journalctl -u bluetooth -f
      // sudo dnf update bluez bluez-libs bluez-utils
      // sudo rmmod btusb
      // sudo modprobe btusb
      break;
    }

    case 'fastapi-models': {
      shellExec(`chmod +x ../full-stack-fastapi-template/backend/initial_data.sh`);
      shellExec(`../full-stack-fastapi-template/backend/initial_data.sh`);
      shellExec(`../full-stack-fastapi-template/backend/initial_data.sh`);
      break;
    }

    case 'fastapi': {
      // node bin/deploy fastapi reset
      // node bin/deploy fastapi reset build-back build-front secret run-back run-front
      // https://github.com/NonsoEchendu/full-stack-fastapi-project
      // https://github.com/fastapi/full-stack-fastapi-template
      const path = `../full-stack-fastapi-template`;
      const VITE_API_URL = `http://localhost:8000`;

      if (process.argv.includes('reset')) shellExec(`sudo rm -rf ${path}`);

      if (!fs.existsSync(path))
        shellExec(`cd .. && git clone https://github.com/fastapi/full-stack-fastapi-template.git`);

      shellExec(`cd ${path} && git checkout . && git clean -f -d`);
      const password = fs.readFileSync(`/home/dd/engine/engine-private/postgresql-password`, 'utf8');

      fs.writeFileSync(
        `${path}/.env`,
        fs
          .readFileSync(`${path}/.env`, 'utf8')
          .replace(`FIRST_SUPERUSER=admin@example.com`, `FIRST_SUPERUSER=development@underpost.net`)
          .replace(`FIRST_SUPERUSER_PASSWORD=changethis`, `FIRST_SUPERUSER_PASSWORD=${password}`)
          .replace(`SECRET_KEY=changethis`, `SECRET_KEY=${password}`)
          .replace(`POSTGRES_DB=app`, `POSTGRES_DB=postgresdb`)
          .replace(`POSTGRES_USER=postgres`, `POSTGRES_USER=admin`)
          .replace(`POSTGRES_PASSWORD=changethis`, `POSTGRES_PASSWORD=${password}`),
        'utf8',
      );
      fs.writeFileSync(
        `${path}/backend/app/core/db.py`,
        fs
          .readFileSync(`${path}/backend/app/core/db.py`, 'utf8')
          .replace(`    # from sqlmodel import SQLModel`, `    from sqlmodel import SQLModel`)
          .replace(`   # SQLModel.metadata.create_all(engine)`, `   SQLModel.metadata.create_all(engine)`),

        'utf8',
      );

      fs.copySync(`./manifests/deployment/fastapi/initial_data.sh`, `${path}/backend/initial_data.sh`);

      fs.writeFileSync(
        `${path}/frontend/Dockerfile`,
        fs
          .readFileSync(`${path}/frontend/Dockerfile`, 'utf8')
          .replace('ARG VITE_API_URL=${VITE_API_URL}', `ARG VITE_API_URL='${VITE_API_URL}'`),
        'utf8',
      );

      fs.writeFileSync(
        `${path}/frontend/.env`,
        fs
          .readFileSync(`${path}/frontend/.env`, 'utf8')
          .replace(`VITE_API_URL=http://localhost:8000`, `VITE_API_URL=${VITE_API_URL}`)
          .replace(`MAILCATCHER_HOST=http://localhost:1080`, `MAILCATCHER_HOST=http://localhost:1081`),

        'utf8',
      );

      if (process.argv.includes('models')) {
        shellExec(`node bin/deploy fastapi-models`);
        break;
      }

      if (process.argv.includes('build-back')) {
        const imageName = `fastapi-backend:latest`;
        shellExec(`sudo podman pull docker.io/library/python:3.10`);
        shellExec(`sudo podman pull ghcr.io/astral-sh/uv:0.5.11`);
        shellExec(`sudo rm -rf ${path}/${imageName.replace(':', '_')}.tar`);
        const args = [
          `node bin dockerfile-image-build --path ${path}/backend/`,
          `--image-name=${imageName} --image-path=${path}`,
          `--podman-save --${process.argv.includes('kubeadm') ? 'kubeadm' : 'kind'}-load --reset`,
        ];
        shellExec(args.join(' '));
      }
      if (process.argv.includes('build-front')) {
        const imageName = `fastapi-frontend:latest`;
        shellExec(`sudo podman pull docker.io/library/node:20`);
        shellExec(`sudo podman pull docker.io/library/nginx:1`);
        shellExec(`sudo rm -rf ${path}/${imageName.replace(':', '_')}.tar`);
        const args = [
          `node bin dockerfile-image-build --path ${path}/frontend/`,
          `--image-name=${imageName} --image-path=${path}`,
          `--podman-save --${process.argv.includes('kubeadm') ? 'kubeadm' : 'kind'}-load --reset`,
        ];
        shellExec(args.join(' '));
      }
      if (process.argv.includes('secret')) {
        {
          const secretSelector = `fastapi-postgres-credentials`;
          shellExec(`sudo kubectl delete secret ${secretSelector}`);
          shellExec(
            `sudo kubectl create secret generic ${secretSelector}` +
              ` --from-literal=POSTGRES_DB=postgresdb` +
              ` --from-literal=POSTGRES_USER=admin` +
              ` --from-file=POSTGRES_PASSWORD=/home/dd/engine/engine-private/postgresql-password`,
          );
        }
        {
          const secretSelector = `fastapi-backend-config-secret`;
          shellExec(`sudo kubectl delete secret ${secretSelector}`);
          shellExec(
            `sudo kubectl create secret generic ${secretSelector}` +
              ` --from-file=SECRET_KEY=/home/dd/engine/engine-private/postgresql-password` +
              ` --from-literal=FIRST_SUPERUSER=development@underpost.net` +
              ` --from-file=FIRST_SUPERUSER_PASSWORD=/home/dd/engine/engine-private/postgresql-password`,
          );
        }
      }
      if (process.argv.includes('run-back')) {
        shellExec(`sudo kubectl apply -f ./manifests/deployment/fastapi/backend-deployment.yml`);
        shellExec(`sudo kubectl apply -f ./manifests/deployment/fastapi/backend-service.yml`);
      }
      if (process.argv.includes('run-front')) {
        shellExec(`sudo kubectl apply -f ./manifests/deployment/fastapi/frontend-deployment.yml`);
        shellExec(`sudo kubectl apply -f ./manifests/deployment/fastapi/frontend-service.yml`);
      }
      break;
    }

    case 'conda': {
      // set -e
      // ENV_NAME="${1:-cuda_env}"
      // eval "$(conda shell.bash hook)"
      // conda activate "${ENV_NAME}"
      shellExec(
        `export PATH="/root/miniconda3/bin:$PATH" && conda init && conda config --set auto_activate_base false`,
      );
      shellExec(`conda env list`);
      break;
    }

    case 'kafka': {
      // https://medium.com/@martin.hodges/deploying-kafka-on-a-kind-kubernetes-cluster-for-development-and-testing-purposes-ed7adefe03cb
      const imageName = `doughgle/kafka-kraft`;
      shellExec(`docker pull ${imageName}`);
      if (!process.argv.includes('kubeadm'))
        shellExec(
          `${process.argv.includes('kubeadm') ? `ctr -n k8s.io images import` : `kind load docker-image`} ${imageName}`,
        );
      shellExec(`kubectl create namespace kafka`);
      shellExec(`kubectl apply -f ./manifests/deployment/kafka/deployment.yaml`);
      // kubectl logs kafka-0 -n kafka | grep STARTED
      // kubectl logs kafka-1 -n kafka | grep STARTED
      // kubectl logs kafka-2 -n kafka | grep STARTED

      // kafka-topics.sh --create --topic my-topic --bootstrap-server kafka-svc:9092
      // kafka-topics.sh --list --topic my-topic --bootstrap-server kafka-svc:9092
      // kafka-topics.sh --delete --topic my-topic --bootstrap-server kafka-svc:9092

      // kafka-console-producer.sh --bootstrap-server kafka-svc:9092 --topic my-topic
      // kafka-console-consumer.sh --bootstrap-server kafka-svc:9092 --topic my-topic
      break;
    }

    case 'nvidia-gpu-operator': {
      // https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
      shellExec(`curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo`);

      const NVIDIA_CONTAINER_TOOLKIT_VERSION = '1.17.8-1';

      shellExec(`sudo dnf install -y \
nvidia-container-toolkit-${NVIDIA_CONTAINER_TOOLKIT_VERSION} \
nvidia-container-toolkit-base-${NVIDIA_CONTAINER_TOOLKIT_VERSION} \
libnvidia-container-tools-${NVIDIA_CONTAINER_TOOLKIT_VERSION} \
libnvidia-container1-${NVIDIA_CONTAINER_TOOLKIT_VERSION}`);

      // https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html

      shellExec(`kubectl create ns gpu-operator`);
      shellExec(`kubectl label --overwrite ns gpu-operator pod-security.kubernetes.io/enforce=privileged`);

      shellExec(`helm repo add nvidia https://helm.ngc.nvidia.com/nvidia \
    && helm repo update`);

      //       shellExec(`helm install --wait --generate-name \
      // -n gpu-operator --create-namespace \
      // nvidia/gpu-operator \
      // --version=v25.3.1 \
      // --set toolkit.version=v1.16.1-ubi8`);

      shellExec(`helm install --wait --generate-name \
-n gpu-operator --create-namespace \
nvidia/gpu-operator \
--version=v25.3.1 \
--set driver.enabled=false \
--set driver.repository=nvcr.io/nvidia \
--set cdi.enabled=true \
--set cdi.default=true \
--set toolkit.env[0].name=CONTAINERD_CONFIG \
--set toolkit.env[0].value=/etc/containerd/config.toml \
--set toolkit.env[1].name=CONTAINERD_SOCKET \
--set toolkit.env[1].value=/run/containerd/containerd.sock \
--set toolkit.env[2].name=CONTAINERD_RUNTIME_CLASS \
--set toolkit.env[2].value=nvidia \
--set-string toolkit.env[3].name=CONTAINERD_SET_AS_DEFAULT \
--set-string toolkit.env[3].value=true`);

      // Check gpu drivers
      shellExec(
        `break;kubectl get nodes -o json | jq '.items[].metadata.labels | keys | any(startswith("feature.node.kubernetes.io"))'`,
      );
      break;
    }

    case 'kubeflow-spark-operator': {
      // Use case:
      // Data Processing Pipelines: Used for ETL tasks where Spark can handle large data volumes efficiently.
      // Real-Time Analytics: Processing data from streaming sources (e.g., Kafka) for real-time analytics.
      // Machine Learning and Data Science: Training and deploying machine learning models at scale using Spark MLlib.

      shellExec(`helm repo add spark-operator https://kubeflow.github.io/spark-operator`);
      shellExec(`helm install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace \
  --wait`);

      const image = `spark:3.5.5`;
      shellExec(`sudo docker pull ${image}`);
      if (!process.argv.includes('kubeadm'))
        shellExec(
          `sudo ${
            process.argv.includes('kubeadm') ? `ctr -n k8s.io images import` : `kind load docker-image`
          } ${image}`,
        );
      shellExec(`kubectl apply -f ./manifests/deployment/spark/spark-pi-py.yaml`);

      // Check the status of the Spark job:
      // kubectl get sparkapplications.sparkoperator.k8s.io -n default
      // kubectl get sparkapplication

      // Check case log:
      // kubectl logs -f spark-pi-python-driver
      // kubectl logs -f spark-pi-python-driver | grep Pi
      // kubectl describe sparkapplication spark-gpu-test

      // Uninstall:
      // kubectl delete sparkapplications.sparkoperator.k8s.io spark-pi-python -n default
      // helm delete spark-operator -n spark-operator

      // Gpu plugins:
      // https://github.com/NVIDIA/spark-rapids
      // RAPIDS Accelerator
      break;
    }

    case 'sbt': {
      // https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Linux.html

      // sudo rm -f /etc/yum.repos.d/bintray-rpm.repo
      // curl -L https://www.scala-sbt.org/sbt-rpm.repo > sbt-rpm.repo
      // sudo mv sbt-rpm.repo /etc/yum.repos.d/
      // sudo yum install sbt
      break;
    }
  }
} catch (error) {
  logger.error(error, error.stack);
}
