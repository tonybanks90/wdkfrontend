// src/lib/api.ts
const RELAYER_API_URL = 'https://wdk-relayer-production.up.railway.app';

export interface SwapParamsSolToBsc {
  makerAddress: string;
  recipientAddress: string;
  sellAmount: string;
  buyAmount: string;
  hashlock: string;
  solanaEscrowPda: string;
}

export interface SwapParamsBscToSol {
  makerAddress: string;
  recipientAddress: string;
  sellAmount: string;
  buyAmount: string;
  hashlock: string;
  bscEscrowId: string;
}

export interface SwapParamsEthToSol {
  makerAddress: string;
  recipientAddress: string;
  sellAmount: string;
  buyAmount: string;
  hashlock: string;
  ethEscrowId: string;
}

export interface SwapParamsSolToEth {
  makerAddress: string;
  recipientAddress: string;
  sellAmount: string;
  buyAmount: string;
  hashlock: string;
  solanaEscrowPda: string;
}

export class RelayerAPI {
  static async requestSolanaToBscSwap(params: SwapParamsSolToBsc) {
    const res = await fetch(`${RELAYER_API_URL}/swap/solana-to-bsc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to request SOL -> BSC swap');
    }
    return res.json();
  }

  static async requestBscToSolanaSwap(params: SwapParamsBscToSol) {
    const res = await fetch(`${RELAYER_API_URL}/swap/bsc-to-solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to request BSC -> SOL swap');
    }
    return res.json();
  }

  static async requestEthToSolanaSwap(params: SwapParamsEthToSol) {
    const res = await fetch(`${RELAYER_API_URL}/swap/eth-to-solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to request ETH -> SOL swap');
    }
    return res.json();
  }

  static async requestSolanaToEthSwap(params: SwapParamsSolToEth) {
    const res = await fetch(`${RELAYER_API_URL}/swap/solana-to-eth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to request SOL -> ETH swap');
    }
    return res.json();
  }

  static async claimSwap(intentId: string, secret: string) {
    const res = await fetch(`${RELAYER_API_URL}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentId, secret }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to claim swap');
    }
    return res.json();
  }

  static async getOrders() {
    const res = await fetch(`${RELAYER_API_URL}/orders`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  }

  static async getOrder(id: string) {
    const res = await fetch(`${RELAYER_API_URL}/orders/${id}`);
    if (!res.ok) throw new Error('Failed to fetch order details');
    return res.json();
  }
}

