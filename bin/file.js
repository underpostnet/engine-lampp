import fs from 'fs-extra';

import { loggerFactory } from '../src/server/logger.js';
import { cap, getCapVariableName, getDirname, newInstance } from '../src/client/components/core/CommonJs.js';
import { shellCd, shellExec } from '../src/server/process.js';
import walk from 'ignore-walk';
import { validateTemplatePath } from '../src/server/conf.js';

const logger = loggerFactory(import.meta);

logger.info('argv', process.argv);

let [exe, dir, type] = process.argv;
let rawPath = process.argv[3].replaceAll(`'`, '');
let toPath = process.argv[4].replaceAll(`'`, '');

let path = `${rawPath}`.split('/');
path.pop();
path = path.join('/');

const file = `${rawPath}`.split('/').pop();
const ext = file.split('.')[1];
let name = getCapVariableName(file.split('.')[0]);

logger.info('File metadata', { path, file, ext, name });

try {
  // throw '';
  // let cmd;
  let content = '';
  switch (type) {
    case 'create-js-module':
      // node bin/file './src/client/components/core/progress bar.js'
      content = `const ${name} = {}; export { ${name} }`;
      setTimeout(() => shellExec(`prettier --write ${buildPath}`));
      break;

    case 'update-template':
    case 'copy-src':
      console.log({ rawPath, toPath });

      // this function returns a promise, but you can also pass a cb
      // if you like that approach better.
      let result = await new Promise((resolve) =>
        walk(
          {
            path: rawPath, // root dir to start in. defaults to process.cwd()
            ignoreFiles: [`.gitignore`], // list of filenames. defaults to ['.ignore']
            includeEmpty: false, // true to include empty dirs, default false
            follow: false, // true to follow symlink dirs, default false
          },
          (...args) => resolve(args[1]),
        ),
      );

      result = result.filter((path) => !path.startsWith('.git'));

      console.log('copy paths', result);

      if (type !== 'update-template') fs.removeSync(toPath);

      for (const copyPath of result) {
        const folder = getDirname(`${toPath}/${copyPath}`);
        const absolutePath = `${rawPath}/${copyPath}`;

        if (type === 'update-template' && !validateTemplatePath(absolutePath)) continue;

        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

        logger.info('build', `${toPath}/${copyPath}`);

        fs.copyFileSync(absolutePath, `${toPath}/${copyPath}`);
      }

      if (type === 'update-template') {
        fs.copySync(`./.vscode`, `../pwa-microservices-template/.vscode`);
        fs.copySync(`./.github`, `../pwa-microservices-template/.github`);
        fs.copySync(`./src/client/public/default`, `../pwa-microservices-template/src/client/public/default`);

        shellCd('../pwa-microservices-template');
        for (const deletePath of ['README.md', 'package-lock.json', 'package.json']) {
          shellExec(`git checkout ${deletePath}`);
        }
        for (const deletePath of [
          '.github/workflows/coverall.yml',
          '.github/workflows/docker-image.yml',
          '.github/workflows/deploy.ssh.yml',
          '.github/workflows/deploy.api-rest.yml',
          '.github/workflows/engine.lampp.ci.yml',
          '.github/workflows/engine.core.ci.yml',
          '.github/workflows/engine.cyberia.ci.yml',
          'bin/web3.js',
          'bin/cyberia.js',
        ]) {
          fs.removeSync('../pwa-microservices-template/' + deletePath);
        }
        shellCd('../engine');
        const originPackageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const templatePackageJson = JSON.parse(fs.readFileSync('../pwa-microservices-template/package.json', 'utf8'));
        templatePackageJson.dependencies = originPackageJson.dependencies;
        templatePackageJson.devDependencies = originPackageJson.devDependencies;
        templatePackageJson.version = originPackageJson.version;
        fs.writeFileSync(
          '../pwa-microservices-template/package.json',
          JSON.stringify(templatePackageJson, null, 4),
          'utf8',
        );

        const originPackageLockJson = JSON.parse(fs.readFileSync('./package-lock.json', 'utf8'));
        const templatePackageLockJson = JSON.parse(
          fs.readFileSync('../pwa-microservices-template/package-lock.json', 'utf8'),
        );
        const originBasePackageLock = newInstance(templatePackageLockJson.packages['']);
        templatePackageLockJson.version = originPackageLockJson.version;
        templatePackageLockJson.packages = originPackageLockJson.packages;
        templatePackageLockJson.packages[''].name = originBasePackageLock.name;
        templatePackageLockJson.packages[''].version = originPackageLockJson.version;
        templatePackageLockJson.packages[''].hasInstallScript = originBasePackageLock.hasInstallScript;
        templatePackageLockJson.packages[''].license = originBasePackageLock.license;
        fs.writeFileSync(
          '../pwa-microservices-template/package-lock.json',
          JSON.stringify(templatePackageLockJson, null, 4),
          'utf8',
        );
      }

      break;
    case 'create':
      const buildPath = `${path}/${name}${ext ? `.${ext}` : ''}`;
      logger.info('Build path', buildPath);
      fs.mkdirSync(path, { recursive: true });
      fs.writeFileSync(buildPath, content, 'utf8');
    default:
      logger.error('not found operator');
      break;
  }
} catch (error) {
  logger.error(error, error.stack);
}
