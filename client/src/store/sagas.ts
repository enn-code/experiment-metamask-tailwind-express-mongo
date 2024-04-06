import { takeEvery } from "redux-saga/effects";
import {
  JsonRpcProvider,
  Transaction,
  TransactionResponse,
  TransactionReceipt,
  BrowserProvider,
  Signer,
  parseUnits,
} from "ethers";

import apolloClient from "../apollo/client";
import { Actions } from "../types";
import { SaveTransaction } from "../queries";
import { navigate } from "../components/NaiveRouter";

function* sendTransaction(formData: any) {
  const provider = new JsonRpcProvider("http://localhost:8545");

  const walletProvider = new BrowserProvider(window.web3.currentProvider);

  const signer: Signer = yield walletProvider.getSigner();

  const accounts: Array<{ address: string }> = yield provider.listAccounts();

  const randomAddress = () => {
    const min = 1;
    const max = 19;
    const random = Math.round(Math.random() * (max - min) + min);
    return accounts[random].address;
  };

  const transaction = {
    to: formData.payload.recipient || randomAddress(),
    value: parseUnits(String(formData.payload.amount), "ether"),
  };

  try {
    const txResponse: TransactionResponse = yield signer.sendTransaction(
      transaction
    );
    const response: TransactionReceipt = yield txResponse.wait();

    const receipt: Transaction = yield response.getTransaction();

    const variables = {
      transaction: {
        gasLimit: (receipt.gasLimit && receipt.gasLimit.toString()) || "0",
        gasPrice: (receipt.gasPrice && receipt.gasPrice.toString()) || "0",
        to: receipt.to,
        from: receipt.from,
        value: (receipt.value && receipt.value.toString()) || "",
        data: receipt.data || null,
        chainId: (receipt.chainId && receipt.chainId.toString()) || "123456",
        hash: receipt.hash,
      },
    };

    yield apolloClient
      .mutate({
        mutation: SaveTransaction,
        variables,
      })
      .then((result) => {
        navigate(`/transaction/${result.data.addTransaction.hash}`);
        document.getElementById("hs-basic-modal")?.classList.add("hidden");
      });
  } catch (error) {
    //
    console.log("error", error);
  }
}

export function* rootSaga() {
  yield takeEvery(Actions.SendTransaction, sendTransaction);
}
