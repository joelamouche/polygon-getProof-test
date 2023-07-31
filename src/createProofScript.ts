import {
  BjjProvider,
  core,
  CredentialStatusResolverRegistry,
  CredentialStatusType,
  CredentialStorage,
  CredentialWallet,
  defaultEthConnectionConfig,
  EthStateStorage,
  IdentityStorage,
  IdentityWallet,
  InMemoryDataSource,
  InMemoryMerkleTreeStorage,
  InMemoryPrivateKeyStore,
  IssuerResolver,
  KMS,
  KmsKeyType,
  ProofService,
  RHSResolver,
  type Identity,
  type Profile,
  type W3CCredential,
} from "@0xpolygonid/js-sdk";

import { testIssuerKeyPair, testKeyPair } from "../test/testKeys";
import {
  kycAgeProofReqSig,
  testKYCAgeCredentialRequest,
} from "../test/testKYCAgeConstants";
import { initCircuitStorageReadFile } from "./initCircuitStorageReadFile";

const RHS_URL = "https://rhs-staging.polygonid.me";

const POLYGON_ID_CONTRACT = "0x134B1BE34911E39A8397ec6289782989729807a4";
const MUMBAI_RPC_URL = "https://rpc.ankr.com/polygon_mumbai";

(async () => {
  // Create key pairs for user and issuer
  const obj: { [key: string]: number } = testKeyPair.data.privateKey;
  const arr = Object.keys(obj).map((key) => obj[key] as number);

  const keyPair = {
    publicKey: Buffer.from(testKeyPair.data.publicKey.data),
    privateKey: Buffer.from(new Uint8Array(Buffer.from(arr))),
  };
  const obj2: { [key: string]: number } = testIssuerKeyPair.data.privateKey;
  const arr2 = Object.keys(obj2).map((key) => obj2[key] as number);
  const issuerKeyPair = {
    publicKey: Buffer.from(testIssuerKeyPair.data.publicKey.data),
    privateKey: Buffer.from(new Uint8Array(Buffer.from(arr2))),
  };

  console.log("creating wallet...");
  // DATA Storage
  const credentialStorage = new InMemoryDataSource<W3CCredential>();

  const config = defaultEthConnectionConfig;
  config.contractAddress = POLYGON_ID_CONTRACT;
  config.url = MUMBAI_RPC_URL;
  const dataStorage = {
    credential: new CredentialStorage(credentialStorage),
    identity: new IdentityStorage(
      new InMemoryDataSource<Identity>(),
      new InMemoryDataSource<Profile>()
    ),
    mt: new InMemoryMerkleTreeStorage(40),
    states: new EthStateStorage(defaultEthConnectionConfig),
  };
  console.log("data storage created");

  // Credential Wallet
  const statusRegistry = new CredentialStatusResolverRegistry();
  statusRegistry.register(
    CredentialStatusType.SparseMerkleTreeProof,
    new IssuerResolver()
  );
  statusRegistry.register(
    CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    new RHSResolver(dataStorage.states)
  );
  const credentialWallet = new CredentialWallet(dataStorage, statusRegistry);
  console.log("credentialWallet created");

  // Identity Wallet
  const privateKeyStore = new InMemoryPrivateKeyStore();
  const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, privateKeyStore);
  const kms = new KMS();
  kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

  const identityWallet = new IdentityWallet(kms, dataStorage, credentialWallet);
  console.log("identityWallet created");

  // create Identities / DIDs
  const createIdentityDID = async (keyPair: {
    publicKey: Buffer;
    privateKey: Buffer;
  }) => {
    return (
      await identityWallet.createIdentity({
        method: core.DidMethod.PolygonId,
        blockchain: core.Blockchain.Polygon,
        networkId: core.NetworkId.Mumbai,
        seed: keyPair.privateKey,
        revocationOpts: {
          type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
          id: RHS_URL, // TEST_ISSUER_URL,
        },
      })
    ).did;
  };
  const userDID = await createIdentityDID(keyPair);
  console.log("createIdentityDID userDID", userDID.toString());
  const issuerDID = await createIdentityDID(issuerKeyPair);
  console.log("createIdentityDID issuerDID", issuerDID.toString());

  // Issue Credential
  console.log("issuing credential...");
  const credential = await identityWallet.issueCredential(
    issuerDID,
    testKYCAgeCredentialRequest
  );
  console.log("credential issued check");

  // Save Credential
  await dataStorage.credential.saveCredential(credential);
  await credentialWallet.save(credential);

  // Circuit Storage
  const circuitStorage = await initCircuitStorageReadFile({
    circuitsFolder: "./circuits",
  });
  console.log("circuitStorage check");

  const w3Ccredential = credential;
  console.log("credential check", credential);
  if (!w3Ccredential) throw new Error("Credential not found");

  // GENERATE PROOF
  const proofService = new ProofService(
    identityWallet,
    credentialWallet,
    circuitStorage,
    dataStorage.states
  );
  const proof = await proofService.generateProof(
    kycAgeProofReqSig,
    userDID,
    w3Ccredential
  );
  console.log("PROOF", proof);
})();
