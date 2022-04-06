// --- React Methods
import React, { useState, useEffect } from "react";

// --- Assets/Artefacts
// import logo from './logo.svg';
import "./App.css";
import dpoppLogofrom from "./assets/dpoppLogo.svg";

// --- Wallet connection utilities
import { initWeb3Onboard } from "./utils/onboard";
import { Account, OnboardAPI } from "@web3-onboard/core/dist/types";
import { useConnectWallet, useWallets } from "@web3-onboard/react";
import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers";
// import { EIP1193Provider } from '@web3-onboard/common';

// --- Identity Tools
import { VerificationRecord, VerifiableCredential } from "@dpopp/types";
import { verifyCredential, verifyMerkleProof, generateMerkle, Proof } from "@dpopp/identity/src";
// - @ hacky-workaround to import @spruceid/didkit-wasm
// issue: when imported directly vite separates the .wasm from the .js and bindings fail
// fix: copying the library into a workspace avoids .vites caching mechanism
import * as DIDKit from "@dpopp/identity/dist/didkit-browser";

// Fetch a verifiable challenge credential
const fetchChallengeCredential = async (address: string) => {
  // fetch challenge as a credential from api
  const response = await fetch("http://localhost:65535/api/v0.0.0/challenge", {
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      payload: {
        address: address,
        type: "Simple",
      },
    }),
  });

  const { credential } = (await response.json()) as { credential: VerifiableCredential };

  return {
    credential,
  };
};

// Fetch a verifiableCredential
const fetchVerifiableCredential = async (address: string | undefined, signer: JsonRpcSigner | undefined) => {
  // check for valid context
  if (address && signer) {
    // first pull a challenge that can be signed by the user
    const challenge = await fetchChallengeCredential(address);
    // sign the challenge provided by the IAM
    const signature = signer && (await signer.signMessage(challenge.credential.credentialSubject.challenge)).toString();
    // fetch a credential from the API
    const response = await fetch("http://localhost:65535/api/v0.0.0/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        payload: {
          address: address,
          type: "Simple",
          proofs: {
            valid: "true",
            username: "test",
            signature: signature,
          },
        },
        challenge: challenge.credential,
      }),
    });

    const { credential, record } = (await response.json()) as {
      credential: VerifiableCredential;
      record: VerificationRecord;
    };

    return {
      signature,
      credential,
      record,
      challenge: challenge.credential,
    };
  } else {
    // no address / signer
    return {
      credential: false,
    };
  }
};

function App(): JSX.Element {
  // Use onboard to control the current provider/wallets
  const [{ wallet }, connect, disconnect] = useConnectWallet(); // eslint-disable-line @typescript-eslint/no-unused-vars
  // const [{ chains, connectedChain, settingChain }, setChain] = useSetChain();
  const connectedWallets = useWallets();
  const [web3Onboard, setWeb3Onboard] = useState<OnboardAPI | undefined>();
  const [label, setLabel] = useState<string | undefined>();
  const [address, setAddress] = useState<string | undefined>();
  const [accounts, setAccounts] = useState<Account[] | undefined>(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [signer, setSigner] = useState<JsonRpcSigner | undefined>();
  const [signature, setSignature] = useState<string | undefined>();
  const [record, setRecord] = useState<false | VerificationRecord | undefined>();
  const [challenge, setChallenge] = useState<false | VerifiableCredential | undefined>();
  const [credential, setCredential] = useState<false | VerifiableCredential | undefined>();
  const [verifiedMerkle, setVerifiedMerkle] = useState<boolean | undefined>();
  const [verifiedCredential, setVerifiedCredential] = useState<boolean | undefined>();

  // const [provider, setProvider] = useState<EIP1193Provider | undefined>();

  // Init onboard to enable hooks
  useEffect(() => {
    setWeb3Onboard(initWeb3Onboard);
  }, []);

  // Update on wallet connect
  useEffect(() => {
    // no connection
    if (!connectedWallets.length) {
      setLabel(undefined);
      setAddress(undefined);
      setAccounts(undefined);
      setRecord(undefined);
      setSigner(undefined);
      setSignature(undefined);
      setChallenge(undefined);
      setCredential(undefined);
      setVerifiedMerkle(undefined);
      setVerifiedCredential(undefined);
      // setProvider(undefined);
    } else {
      // record details
      setLabel(connectedWallets[0]?.label);
      setAddress(connectedWallets[0]?.accounts[0].address);
      setAccounts(connectedWallets[0]?.accounts);
      // get the signer from an ethers wrapped Web3Provider
      setSigner(new Web3Provider(connectedWallets[0]?.provider).getSigner());
      // setProvider(connectedWallets[0]?.provider);
      // flaten array for storage
      const connectedWalletsLabelArray = connectedWallets.map(({ label }) => label);
      // store in localstorage
      window.localStorage.setItem("connectedWallets", JSON.stringify(connectedWalletsLabelArray));
    }
  }, [connectedWallets]);

  // Connect wallet on reload
  useEffect(() => {
    // retrieve localstorage state
    const previouslyConnectedWallets = JSON.parse(window.localStorage.getItem("connectedWallets") || "[]") as string[];
    if (previouslyConnectedWallets?.length) {
      /* eslint-disable no-inner-declarations */
      async function setWalletFromLocalStorage() {
        void (await connect({
          autoSelect: {
            label: previouslyConnectedWallets[0],
            disableModals: true,
          },
        }));
      }
      // restore from localstorage
      setWalletFromLocalStorage().catch((e) => {
        throw e;
      });
    }
  }, [web3Onboard, connect]);

  // Toggle connect/disconnect
  const handleConnection = () => {
    if (!address) {
      connect({}).catch((e) => {
        throw e;
      });
    } else {
      disconnect({
        label: label || "",
      }).catch((e) => {
        throw e;
      });
    }
  };

  return (
    <div className="bg-violet-700 font-librefranklin text-gray-100 min-h-max font-miriam-libre min-h-default">
      <div className="container px-5 py-24 mx-auto">
        <div className="mx-auto flex flex-wrap">
          <div className="w-1/2 w-full py-6 mb-6">
            <img src={dpoppLogofrom} className="App-logo" alt="logo" />
            <div className="font-miriam-libre text-gray-050 mt-10 font-normal font-bold leading-relaxed">
              <p className="text-6xl">
                Gitcoin
                <br />
                ID Passport
              </p>
            </div>
            <div className="font-libre-franklin md:w-1/3 mt-10 text-xl">
              Gitcoin ID Passport is an identity aggregator of the top identity providers in the web3 space into one
              transportable identity that proves your personhood.
            </div>

            <div className="mb-10 mt-10 md:w-1/4">
              <button
                data-testid="connectWalletButton"
                className="bg-gray-100 text-violet-500 rounded-lg py-4 px-20 min-w-full"
                onClick={handleConnection}
              >
                <p className="text-base">{address ? `Disconnect from ${label || ""}` : "Get Started"}</p>
              </button>
              {address ? <div className="pt-3">Connected to: {JSON.stringify(address, null, 2)}</div> : null}
              {/* {accounts &&
                accounts.map((account: Account) => {
                  return (
                    <div key={label}>
                      <div className="py-3">{label} Accounts Available:</div>
                      <div>
                        <pre>{JSON.stringify(account, null, 4)}</pre>
                      </div>
                    </div>
                  );
                })} */}
            </div>
            <a className="underline">Why use your wallet as your identity?</a>
            <button
              className="bg-gray-100 mb-10 min-w-full mt-10 px-20 py-4 rounded-lg text-violet-500"
              onClick={() => {
                // fetch an example VC from the IAM server
                fetchVerifiableCredential(address, signer)
                  .then((res) => {
                    setSignature(res.signature);
                    setRecord(res.record as VerificationRecord);
                    setChallenge(res.challenge as VerifiableCredential);
                    setCredential(res.credential as VerifiableCredential);
                    // reset verification
                    setVerifiedCredential(undefined);
                    setVerifiedMerkle(undefined);
                  })
                  .catch((e) => {
                    throw e;
                  });
              }}
            >
              Issue a Verifiable Credential
            </button>
            {challenge ? <p>✅ Challenged received ({challenge.credentialSubject.challenge}) </p> : null}
            {challenge ? <p>✅ Challenged signed ({signature}) </p> : null}
            {credential ? <p>✅ Credential issued: </p> : null}
            {credential ? <pre>{JSON.stringify(credential, null, 4)}</pre> : null}
            {record ? <p>✅ Provided with the following information: </p> : null}
            {record ? <pre>{JSON.stringify(record, null, 4)}</pre> : null}
            {credential ? (
              <button
                className="bg-gray-100 mb-10 min-w-full mt-10 px-20 py-4 rounded-lg text-violet-500"
                onClick={() => {
                  if (record) {
                    // Recreate the merkle root
                    const merkle = generateMerkle(record);
                    // extract a single proof to test is a secret matches the proof in the root
                    const matchingProof = merkle.proofs.username as Proof<string | Buffer>;
                    const matchingSecret = record.username || "";
                    const matchingRoot = credential.credentialSubject.root;
                    // check if the proof verifies this content
                    const verifiedProof = verifyMerkleProof(matchingProof, matchingSecret, matchingRoot);
                    // verify that the VC was generated by the trusted authority
                    verifyCredential(DIDKit, credential)
                      .then((verifiedVC) => {
                        setVerifiedCredential(verifiedVC);
                        setVerifiedMerkle(verifiedProof);
                      })
                      .catch((e) => {
                        throw e;
                      });
                  }
                }}
              >
                Verify Credential
              </button>
            ) : null}
            {verifiedMerkle ? (
              <p>✅ MerkleProof verifiable contains the passed in username ({record && record.username})</p>
            ) : null}
            {verifiedCredential ? (
              <p>✅ Credential has verifiably been issued by {credential && credential.issuer} </p>
            ) : null}
          </div>
          <div className="lg:w-1/2 w-full lg:h-auto object-cover object-center rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default App;