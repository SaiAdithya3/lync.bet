import { createConfig, http } from "wagmi";
import { arbitrum, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [baseSepolia, arbitrum],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
    [arbitrum.id]: http(),
  },
});
