import { PluginKeychainMemory } from '@hyperledger/cactus-plugin-keychain-memory';
import { existsSync, mkdirSync, readFileSync, write, writeFileSync } from 'fs';
import { join } from 'path';

interface IFSKeychainOptions {
  keychainId: string;
  orgName: string;
}

export default class FSKeychain extends PluginKeychainMemory {
  private readonly certPath = join(__dirname, '..', '.certStore');
  constructor(opts: IFSKeychainOptions) {
    super({
      logLevel: 'ERROR',
      keychainId: opts.keychainId,
      instanceId: 'FSKeychain',
    });
    this.certPath = join(__dirname, '..', `.certStore.${opts.orgName}`);
    if (!existsSync(this.certPath)) {
      mkdirSync(this.certPath);
    }
  }
  async get(key: string): Promise<string> {
    const fName = join(this.certPath, key + '.json');
    return readFileSync(fName, 'utf-8');
  }

  async set(key: string, value: string): Promise<void> {
    const fName = join(this.certPath, key + '.json');
    writeFileSync(fName, JSON.stringify(JSON.parse(value), null, 4));
  }
}
