import {
  CircuitId,
  CredentialStatusType,
  type ZeroKnowledgeProofRequest,
} from "@0xpolygonid/js-sdk";

export const kycAgeProofReqSig: ZeroKnowledgeProofRequest = {
  id: 1,
  circuitId: CircuitId.AtomicQuerySigV2,
  optional: false,
  query: {
    allowedIssuers: ["*"],
    type: "KYCAgeCredential",
    context:
      "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld",
    credentialSubject: {
      birthday: {
        $lt: 20020101,
      },
    },
  },
};

export const testKYCAgeCredentialRequest = {
  credentialSchema:
    "https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json/KYCAgeCredential-v3.json",
  type: "KYCAgeCredential",
  credentialSubject: {
    birthday: 19960404,
    documentType: 347261,
    id: "did:polygonid:polygon:mumbai:2qMHK9MWesochNPyfLjkS2tUZQzkjCn4vtFkfJ8rC4",
  },
  expiration: 1687459200000,
  signatureProof: true,
  mtProof: false,
  revocationOpts: {
    type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
    id: "https://rhs-staging.polygonid.me",
  },
};
