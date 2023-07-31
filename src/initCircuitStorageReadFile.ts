import fs from "fs";
import {
  CircuitId,
  CircuitStorage,
  InMemoryDataSource,
  type CircuitData,
} from "@0xpolygonid/js-sdk";

export type CircuitStorageFetchProgress =
  | "loading"
  | "1/4"
  | "2/4"
  | "3/4"
  | "4/4"
  | "done";

async function getFile(filePath: string): Promise<Uint8Array> {
  return new Promise((res, rej) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        rej(err);
        //throw new Error('Error reading file:', err);
      } else {
        const arr = new Uint8Array(data);
        res(arr);
      }
    });
  });
}

export async function initCircuitStorageReadFile(props: {
  circuitsFolder: string;
  onProgress?: (
    progress: "loading" | "1/4" | "2/4" | "3/4" | "4/4" | "done"
  ) => void;
}) {
  await new Promise<void>((res) => {
    fs.readdir(".", (err, files) => {
      if (err) {
        console.error("Error reading directory:", err);
      } else {
        console.log("Files in the directory:", files);
        res();
      }
    });
  });
  const cs = new CircuitStorage(new InMemoryDataSource<CircuitData>());
  try {
    console.time("check loading circuits from DB");
    await cs.loadCircuitData(CircuitId.AuthV2);
    console.timeEnd("check loading circuits from DB");
  } catch (e) {
    console.time("CircuitStorageInstance.init");
    props.onProgress?.("loading");
    const auth_w = await getFile(`${props.circuitsFolder}/authV2/circuit.wasm`);
    const mtp_w = await getFile(
      `${props.circuitsFolder}/credentialAtomicQueryMTPV2/circuit.wasm`
    );
    const sig_w = await getFile(
      `${props.circuitsFolder}/credentialAtomicQuerySigV2/circuit.wasm`
    );
    props.onProgress?.("1/4");
    const auth_z = await getFile(
      `${props.circuitsFolder}/authV2/circuit_final.zkey`
    );
    props.onProgress?.("2/4");
    const mtp_z = await getFile(
      `${props.circuitsFolder}/credentialAtomicQueryMTPV2/circuit_final.zkey`
    );
    props.onProgress?.("3/4");
    const sig_z = await getFile(
      `${props.circuitsFolder}/credentialAtomicQuerySigV2/circuit_final.zkey`
    );

    const auth_j = await getFile(
      `${props.circuitsFolder}/authV2/verification_key.json`
    );
    const mtp_j = await getFile(
      `${props.circuitsFolder}/credentialAtomicQueryMTPV2/verification_key.json`
    );
    const sig_j = await getFile(
      `${props.circuitsFolder}/credentialAtomicQuerySigV2/verification_key.json`
    );
    console.timeEnd("CircuitStorageInstance.init");
    console.time("CircuitStorageInstance.saveCircuitData");
    props.onProgress?.("4/4");
    await cs.saveCircuitData(CircuitId.AuthV2, {
      circuitId: "authV2".toString(),
      wasm: auth_w,
      provingKey: auth_z,
      verificationKey: auth_j,
    });
    await cs.saveCircuitData(CircuitId.AtomicQueryMTPV2, {
      circuitId: "credentialAtomicQueryMTPV2".toString(),
      wasm: mtp_w,
      provingKey: mtp_z,
      verificationKey: mtp_j,
    });
    await cs.saveCircuitData(CircuitId.AtomicQuerySigV2, {
      circuitId: "credentialAtomicQuerySigV2".toString(),
      wasm: sig_w,
      provingKey: sig_z,
      verificationKey: sig_j,
    });
    props.onProgress?.("done");
    console.timeEnd("CircuitStorageInstance.saveCircuitData");
  }
  return cs;
}
