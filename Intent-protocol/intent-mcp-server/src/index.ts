import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

// Create the Intent MCP Server
const server = new McpServer({
    name: "Intent Protocol MCP Server",
    version: "1.0.0"
});

// Tool: create_intent_swap
server.tool(
    "create_intent_swap",
    "Creates a cross-chain atomic swap intent by interacting with the local Relayer. Call this when the user wants to bridge funds.",
    {
        sourceChain: z.enum(['bsc', 'solana']).describe("The chain user is sending from"),
        destChain: z.enum(['bsc', 'solana']).describe("The chain user is receiving on"),
        sellAmount: z.string().describe("Amount of tokens to lock on source chain (in smallest units like wei/lamports)"),
        buyAmount: z.string().describe("Expected amount on the dest chain"),
        sourceMakerAddress: z.string().describe("User's wallet string on the source chain"),
        destRecipientAddress: z.string().describe("User's wallet string on the dest chain"),
    },
    async (args) => {
        try {
            // Generate deterministic or random 32-byte secret Hashlock
            const secret = crypto.randomBytes(32);
            const hashlock = "0x" + crypto.createHash('sha256').update(secret).digest('hex');

            // The MCP server uses the WDK SDK toolsets to natively sign a transaction on behalf of the user's wallet!
            // Wait for WDK MCP integration or mock execution relying on the backend APIs
            
            // For now, let's scaffold the PENDING state on the relayer backend API `/swap`
            const relayerUrl = "http://localhost:3002";
            const endpoint = args.sourceChain === 'bsc' ? '/swap/bsc-to-sol' : '/swap/sol-to-bsc';
            
            const payload = {
                makerAddress: args.sourceMakerAddress,
                recipientAddress: args.destRecipientAddress,
                sellAmount: args.sellAmount,
                buyAmount: args.buyAmount,
                hashlock: hashlock,
                solanaEscrowPda: "DUMMY_PDA" 
            };

            const response = await fetch(`${relayerUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return { content: [{ type: "text", text: `Failed to create intent via API. Status: ${response.status}` }] };
            }

            const data = await response.json();

            return {
                content: [{
                    type: "text",
                    text: `SUCCESS! Intent ${data.intent.id || 'N/A'} created for swapping ${args.sellAmount} ${args.sourceChain} to ${args.destChain}.\n\n` +
                          `Hashlock: ${hashlock}\nSecret (DO NOT SHARE): ${secret.toString('hex')}\n\n` +
                          `Action Required: The user must now autonomously sign the Escrow lock transaction on ${args.sourceChain} using their WDK or Web3 wallet. Once they do, the relayer will fill the destination side.`
                }]
            };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

// Tool: claim_dest_funds
server.tool(
    "claim_dest_funds",
    "Once the Destination Escrow is filled by the relayer, the user must call this tool to reveal their secret and extract the bridged funds.",
    {
        intentId: z.string().describe("The Intent ID generated during create_intent_swap"),
        secretHex: z.string().describe("The 32-byte secret hex string generated earlier")
    },
    async (args) => {
        try {
            // Here the Agent would natively interact with the smart contract using its WDK Wallet config.
            // Pinging the Relayer /claim payload completes the loop!
            
            const response = await fetch(`http://localhost:3002/claim`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intentId: args.intentId,
                    secret: args.secretHex.replace("0x", "")
                })
            });

            if (!response.ok) {
                return { content: [{ type: "text", text: `Failed to claim funds. Relayer API Error: ${response.status}` }] };
            }
            
            return {
                content: [{ type: "text", text: `🎉 Atomic swap successfully claimed on both chains! Secret revealed: ${args.secretHex}` }]
            };
        } catch (error: any) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Intent MCP Server running on stdio!");
}

main().catch((error) => console.error("Fatal error:", error));
