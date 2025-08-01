import { commitData } from '../client/components/core/CommonJs.js';
import dotenv from 'dotenv';
import { pbcopy, shellExec } from '../server/process.js';
import { actionInitLog, loggerFactory } from '../server/logger.js';
import fs from 'fs-extra';
import { getNpmRootPath } from '../server/conf.js';
import UnderpostStartUp from '../server/start.js';

dotenv.config();

const logger = loggerFactory(import.meta);

class UnderpostRepository {
  static API = {
    clone(gitUri = 'underpostnet/pwa-microservices-template', options = { bare: false, g8: false }) {
      const gExtension = options.g8 === true ? '.g8' : '.git';
      const repoName = gitUri.split('/').pop();
      if (fs.existsSync(`./${repoName}`)) fs.removeSync(`./${repoName}`);
      shellExec(
        `git clone ${options?.bare === true ? ` --bare ` : ''}https://${
          process.env.GITHUB_TOKEN ? `${process.env.GITHUB_TOKEN}@` : ''
        }github.com/${gitUri}${gExtension}`,
        {
          disableLog: true,
        },
      );
    },
    pull(repoPath = './', gitUri = 'underpostnet/pwa-microservices-template', options = { g8: false }) {
      const gExtension = options.g8 === true ? '.g8' : '.git';
      shellExec(
        `cd ${repoPath} && git pull https://${
          process.env.GITHUB_TOKEN ? `${process.env.GITHUB_TOKEN}@` : ''
        }github.com/${gitUri}${gExtension}`,
        {
          disableLog: true,
        },
      );
    },
    commit(
      repoPath = './',
      commitType = 'feat',
      subModule = '',
      message = '',
      options = {
        copy: false,
        info: false,
        empty: false,
      },
    ) {
      if (commitType === 'reset') {
        shellExec(`cd ${repoPath} && git reset --soft HEAD~${isNaN(parseInt(subModule)) ? 1 : parseInt(subModule)}`);
        return;
      }
      if (options.info) return logger.info('', commitData);
      const _message = `${commitType}${subModule ? `(${subModule})` : ''}${process.argv.includes('!') ? '!' : ''}: ${
        commitData[commitType].emoji
      } ${message ? message : commitData[commitType].description}`;
      if (options.copy) return pbcopy(_message);
      shellExec(`cd ${repoPath} && git commit ${options?.empty ? `--allow-empty ` : ''}-m "${_message}"`);
    },

    push(repoPath = './', gitUri = 'underpostnet/pwa-microservices-template', options = { f: false, g8: false }) {
      const gExtension = options.g8 === true || options.G8 === true ? '.g8' : '.git';
      shellExec(
        `cd ${repoPath} && git push https://${process.env.GITHUB_TOKEN}@github.com/${gitUri}${gExtension}${
          options?.f === true ? ' --force' : ''
        }`,
        {
          disableLog: true,
        },
      );
      logger.info(
        'commit url',
        `http://github.com/${gitUri}${gExtension === '.g8' ? '.g8' : ''}/commit/${shellExec(
          `cd ${repoPath} && git rev-parse --verify HEAD`,
          {
            stdout: true,
          },
        ).trim()}`,
      );
    },

    new(repositoryName) {
      return new Promise(async (resolve, reject) => {
        try {
          await logger.setUpInfo();
          if (repositoryName === 'service')
            return resolve(
              await UnderpostStartUp.API.listenPortController(UnderpostStartUp.API.listenServerFactory(), ':'),
            );
          else actionInitLog();
          const exeRootPath = `${getNpmRootPath()}/underpost`;
          const destFolder = `./${repositoryName}`;
          logger.info('Note: This process may take several minutes to complete');
          logger.info('build app', { destFolder });
          if (fs.existsSync(destFolder)) fs.removeSync(destFolder);
          fs.mkdirSync(destFolder, { recursive: true });
          fs.copySync(exeRootPath, destFolder);
          fs.writeFileSync(`${destFolder}/.gitignore`, fs.readFileSync(`${exeRootPath}/.dockerignore`, 'utf8'), 'utf8');
          shellExec(`cd ${destFolder} && git init && git add . && git commit -m "Base template implementation"`);
          shellExec(`cd ${destFolder} && npm run build`);
          shellExec(`cd ${destFolder} && npm run dev`);
          return resolve();
        } catch (error) {
          logger.error(error, error.stack);
          return reject(error.message);
        }
      });
    },

    getDeleteFiles(path = '.') {
      const commandUntrack = `cd ${path} && git ls-files --deleted`;
      const diffUntrackOutput = shellExec(commandUntrack, { stdout: true, silent: true });
      return diffUntrackOutput.toString().split('\n').filter(Boolean);
    },

    getChangedFiles(path = '.', extension = '', head = false) {
      const extensionFilter = extension ? `-- '***.${extension}'` : '';
      const command = `cd ${path} && git diff ${head ? 'HEAD^ HEAD ' : ''}--name-only ${extensionFilter}`;
      const commandUntrack = `cd ${path} && git ls-files --others --exclude-standard`;
      const diffOutput = shellExec(command, { stdout: true, silent: true });
      const diffUntrackOutput = shellExec(commandUntrack, { stdout: true, silent: true });
      const deleteFiles = UnderpostRepository.API.getDeleteFiles(path);
      return diffOutput
        .toString()
        .split('\n')
        .filter(Boolean)
        .concat(diffUntrackOutput.toString().split('\n').filter(Boolean))
        .filter((f) => !deleteFiles.includes(f));
    },
  };
}

export default UnderpostRepository;
