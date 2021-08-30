import { Logger, LoggerProvider, LogLevelDesc } from '@hyperledger/cactus-common';
import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  PluginLedgerConnectorFabric,
  FabricSigningCredential,
  FabricSigningCredentialType,
  FabricContractInvocationType,
} from '@hyperledger/cactus-plugin-ledger-connector-fabric';
import FSKeychain from './fs-keychain';
import { PluginRegistry } from '@hyperledger/cactus-core';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { VaultKey } from '@hyperledger/cactus-plugin-ledger-connector-fabric/dist/lib/main/typescript/identity/identity-provider';

interface IEndpointOptions {
  logLevel: LogLevelDesc;
  orgName: string;
}
const fabricCMPPath = join(__dirname, '..', '..', 'components', 'fabric');

export default class Endpoint {
  private readonly log: Logger;
  public readonly router: Router;
  private readonly ledger: PluginLedgerConnectorFabric;
  private readonly keychainId = 'certStore';
  private readonly caID: string;
  private readonly mspID: string;
  private readonly affiliation: string;
  constructor(opts: IEndpointOptions) {
    this.log = LoggerProvider.getOrCreate({ level: opts.logLevel, label: 'Endpoint' });
    const keychain = new FSKeychain({
      keychainId: this.keychainId,
      orgName: opts.orgName,
    });
    const ccpRaw = readFileSync(join(fabricCMPPath, `connection-${opts.orgName}.json`)).toString(
      'utf-8',
    );
    const ccp = JSON.parse(ccpRaw);
    const pluginRegistry = new PluginRegistry({ plugins: [keychain] });
    this.ledger = new PluginLedgerConnectorFabric({
      supportedIdentity: [FabricSigningCredentialType.X509, FabricSigningCredentialType.VaultX509],
      vaultConfig: {
        endpoint: 'http://localhost:8200',
        transitEngineMountPath: '/transit',
      },
      logLevel: 'INFO',
      peerBinary: 'not-required',
      cliContainerEnv: {},
      pluginRegistry: pluginRegistry,
      sshConfig: {},
      connectionProfile: ccp as any,
      instanceId: 'cactus-fabric-with-identities-sample',
      discoveryOptions: {
        enabled: true,
        asLocalhost: true,
      },
    });
    this.caID = `ca.${opts.orgName}.example.com`;
    if (opts.orgName === 'org1') {
      this.mspID = 'Org1MSP';
    } else {
      this.mspID = 'Org2MSP';
    }
    this.affiliation = `${opts.orgName}.department1`;
    this.router = Router();
    this._registerRouter();
  }

  private async enroll(req: Request, res: Response) {
    const fnTag = '#enroll';
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        msg: errors.array(),
      });
    }
    const id = req.query.username as string;
    const sigType = req.query.signingType;
    this.log.info(`${fnTag} id = ${id} , identity type = ${sigType}`);
    let signer: FabricSigningCredential;
    try {
      signer = this._getSigner(req);
    } catch (error) {
      this.log.info(`${fnTag} : ${error}`);
      return res.status(404).json({
        error: (error as Error).message,
        msg: 'failed to enroll',
      });
    }
    this.log.debug(`${fnTag} enrolling with ${this.caID}`);
    try {
      await this.ledger.enroll(signer, {
        enrollmentID: id,
        enrollmentSecret: req.body.secret,
        caId: this.caID,
        mspId: this.mspID,
      });
    } catch (error) {
      this.log.info(`${fnTag} failed to enroll ${id} of type = ${sigType}`);
      return res.status(405).json({
        error: (error as Error).message,
        msg: 'failed to enroll',
      });
    }
    this.log.info(`${fnTag} success enrolling ${id} of type = ${sigType}`);
    res.status(201).send('CLIENT ENROLLED');
  }

  private async register(req: Request, res: Response) {
    const fnTag = '#register';
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        msg: errors.array(),
      });
    }
    const id = req.query.username as string;
    const sigType = req.query.signingType;
    this.log.info(`${fnTag} id = ${id} , identity type = ${sigType}`);
    let signer: FabricSigningCredential;
    try {
      signer = this._getSigner(req);
    } catch (error) {
      this.log.info(`${fnTag} : ${error}`);
      return res.status(404).json({
        error: (error as Error).message,
        msg: 'failed to register',
      });
    }
    this.log.debug(`${fnTag} registering with ${this.caID}`);
    try {
      const secret = await this.ledger.register(
        signer,
        {
          enrollmentID: req.query.enrollmentId as string,
          affiliation: this.affiliation,
        },
        this.caID,
      );
      this.log.info(`${fnTag} success registered ${id} of type = ${sigType}`);
      return res.status(201).json({
        enrollmentSecret: secret,
      });
    } catch (error) {
      this.log.info(`${fnTag} failed to register ${id} of type = ${sigType}`);
      return res.status(405).json({
        error: (error as Error).message,
        msg: 'failed to register',
      });
    }
  }

  private async query(req: Request, res: Response) {
    const fnTag = '#query';
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        msg: errors.array(),
      });
    }
    const id = req.query.username;
    const sigType = req.query.signingType;
    this.log.debug(`${fnTag} user = ${id} making query to fabric, identity type = ${sigType}`);
    this.log.info(`${fnTag} id = ${id} , identity type = ${sigType}`);
    let signer: FabricSigningCredential;
    try {
      signer = this._getSigner(req);
    } catch (error) {
      this.log.info(`${fnTag} : ${error}`);
      return res.status(404).json({
        error: (error as Error).message,
        msg: 'failed to query',
      });
    }
    const method: string = req.query.ccMethod as string;
    const params: string[] = req.query.ccParams as string[];
    this.log.debug(`${fnTag} querying basic chaincode`);
    try {
      const { functionOutput } = await this.ledger.transact({
        signingCredential: signer,
        channelName: 'mychannel',
        contractName: 'basic',
        methodName: method,
        params: params,
        invocationType: FabricContractInvocationType.Call,
      });
      this.log.debug(`${fnTag} response from fabric = ${functionOutput}`);
      res.status(200).json(JSON.parse(functionOutput));
    } catch (error) {
      this.log.info(`${fnTag} failed to query using identity of ${id}, typed = ${sigType}`);
      return res.status(405).json({
        error: (error as Error).message,
        msg: 'failed to query',
      });
    }
  }

  private async invoke(req: Request, res: Response) {
    const fnTag = '#invoke';
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        msg: errors.array(),
      });
    }
    const id = req.query.username;
    const sigType = req.query.signingType;
    this.log.debug(`${fnTag} user = ${id} making invoke to fabric, identity type = ${sigType}`);
    this.log.info(`${fnTag} id = ${id} , identity type = ${sigType}`);
    let signer: FabricSigningCredential;
    try {
      signer = this._getSigner(req);
    } catch (error) {
      this.log.info(`${fnTag} : ${error}`);
      return res.status(404).json({
        error: (error as Error).message,
        msg: 'failed to invoke',
      });
    }
    const method: string = req.query.ccMethod as string;
    const params: string[] = req.query.ccParams as string[];
    this.log.debug(`${fnTag} querying basic chaincode`);
    try {
      const { functionOutput } = await this.ledger.transact({
        signingCredential: signer,
        channelName: 'mychannel',
        contractName: 'basic',
        methodName: method,
        params: params,
        invocationType: FabricContractInvocationType.Send,
      });
      this.log.debug(`${fnTag} response from fabric = ${functionOutput}`);
      res.status(200).json(functionOutput);
    } catch (error) {
      this.log.info(`${fnTag} failed to invoke using identity of ${id}, typed = ${sigType}`);
      return res.status(405).json({
        error: (error as Error).message,
        msg: 'failed to invoke',
      });
    }
  }

  private async rotateKey(req: Request, res: Response) {
    const fnTag = '#rotateKey';
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        msg: errors.array(),
      });
    }
    const id = req.query.username as string;
    const sigType = req.query.signingType;
    this.log.info(`${fnTag} id = ${id} , identity type = ${sigType}`);
    let signer: FabricSigningCredential;
    try {
      signer = this._getSigner(req);
    } catch (error) {
      this.log.info(`${fnTag} : ${error}`);
      return res.status(404).json({
        error: (error as Error).message,
        msg: 'failed to rotate key',
      });
    }
    try {
      await this.ledger.rotateKey(signer, {
        enrollmentID: id,
        enrollmentSecret: req.body.secret,
        caId: this.caID,
      });
    } catch (error) {
      this.log.info(`${fnTag} failed to rotate key of ${id}, type = ${sigType}`);
      return res.status(405).json({
        error: (error as Error).message,
        msg: 'failed to rotate key',
      });
    }
    this.log.info(`${fnTag} success rotating key of ${id} of type = ${sigType}`);
    res.status(201).send('KEY ROTATED');
  }

  private _registerRouter() {
    this.router.post(
      '/ca/enroll',
      [
        query('signingType').custom(this._identityTypeValidator),
        query('username').isString().notEmpty(),
        body('secret').isString().notEmpty(),
      ],
      this.enroll.bind(this),
    );
    this.router.post(
      '/ca/rotateKey',
      [
        query('signingType').custom(this._identityTypeValidator),
        query('username').isString().notEmpty(),
        body('secret').isString().notEmpty(),
      ],
      this.rotateKey.bind(this),
    );
    this.router.post(
      '/ca/register',
      [
        query('signingType').custom(this._identityTypeValidator),
        query('username').isString().notEmpty(),
        query('enrollmentId').isString().notEmpty(),
      ],
      this.register.bind(this),
    );
    this.router.get(
      '/fabric',
      [
        query('signingType').custom(this._identityTypeValidator),
        query('username').isString().notEmpty(),
        query('ccMethod').isString().notEmpty(),
        query('ccParams').isArray().optional(),
      ],
      this.query.bind(this),
    );
    this.router.post(
      '/fabric',
      [
        query('signingType').custom(this._identityTypeValidator),
        query('username').isString().notEmpty(),
        query('ccMethod').isString().notEmpty(),
        query('ccParams').isArray().optional(),
      ],
      this.invoke.bind(this),
    );
  }

  private _identityTypeValidator(value: string): boolean {
    if (!['VAULT', 'DEFAULT'].includes(value)) {
      throw new Error(`only VAULT and DEFAULT identity supported`);
    }
    return true;
  }

  private _getSigner(req: Request): FabricSigningCredential {
    const id = req.query.username;
    const sigType = req.query.signingType;
    let iType: FabricSigningCredentialType;
    let vaultKey: VaultKey;
    switch (sigType) {
      case 'VAULT':
        iType = FabricSigningCredentialType.VaultX509;
        const vk = this._getVaultCred(req);
        vaultKey = {
          token: vk.token,
          keyName: vk.keyName,
        };
        break;
      case 'DEFAULT':
        iType = FabricSigningCredentialType.X509;
        break;
    }
    return {
      keychainId: this.keychainId,
      keychainRef: id + '-' + sigType,
      type: iType,
      vaultTransitKey: vaultKey,
    };
  }
  private _getVaultCred(req: Request): { keyName: string; token: string } {
    if (!req.headers['authorization']) {
      throw new Error('authorization header not provided');
    }
    const base64 = (req.headers['authorization'] as string).split(' ')[1];
    const rawString = Buffer.from(base64, 'base64').toString('utf-8');
    const raw = rawString.split(':');
    return {
      keyName: raw[0],
      token: raw[1],
    };
  }
}
