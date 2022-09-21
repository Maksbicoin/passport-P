// --- React Methods
import React, { useContext, useState } from "react";

// --- Chakra Elements
import { Modal, ModalOverlay, ModalContent, Spinner } from "@chakra-ui/react";

// --- Shared context
import { UserContext } from "../context/userContext";

import { AdditionalSignature, fetchAdditionalSigner } from "../signer/utils";

import { AdditionalStamps } from "./AdditionalStamps";

export type NoStampModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const NoStampModal = ({ isOpen, onClose }: NoStampModalProps) => {
  // pull context in to element
  const { address } = useContext(UserContext);
  const [verificationInProgress, setVerificationInProgress] = useState(false);
  const [additionalSigner, setAdditionalSigner] = useState<AdditionalSignature | undefined>();

  return (
    <Modal isOpen={isOpen} onClose={onClose} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent>
        <div className="m-3 flex flex-col items-center">
          {additionalSigner ? (
            <AdditionalStamps additionalSigner={additionalSigner} />
          ) : (
            <>
              <div className="mt-2 w-fit rounded-full bg-pink-500/25">
                <img className="m-2" alt="shield-exclamation-icon" src="./assets/shield-exclamation-icon-warning.svg" />
              </div>
              <p className="m-1 text-sm font-bold">No Stamp Found</p>
              <p className="m-1 mb-4 text-center">
                The stamp you are trying to verify could not be associated with your current Ethereum wallet address.
              </p>
              <div className="flex w-full">
                <a
                  href="https://ens.domains/"
                  target="_blank"
                  className="m-1 w-1/2 items-center rounded-md border py-2  text-center"
                  rel="noreferrer"
                  onClick={() => {
                    onClose();
                  }}
                >
                  Go to ENS
                </a>
                <button
                  data-testid="check-other-wallet"
                  className="m-1 mx-auto flex w-1/2 justify-center rounded-md bg-purple-connectPurple py-2 text-white hover:bg-purple-200 hover:text-black"
                  onClick={async () => {
                    // mark as verifying
                    setVerificationInProgress(true);
                    try {
                      // fetch the credentials
                      const additionalSigner = await fetchAdditionalSigner(address!);
                      setAdditionalSigner(additionalSigner);
                    } finally {
                      // mark as done
                      setVerificationInProgress(false);
                    }
                  }}
                >
                  {verificationInProgress && (
                    <Spinner
                      thickness="4px"
                      speed="0.65s"
                      emptyColor="gray.200"
                      color="purple.500"
                      size="sm"
                      data-testid="loading-indicator"
                      className="my-auto mr-2"
                    />
                  )}
                  Try another wallet
                </button>
              </div>
            </>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
};
