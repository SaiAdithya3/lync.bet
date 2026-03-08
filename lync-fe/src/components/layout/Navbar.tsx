import { useState } from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { ConnectWalletButton } from "../ui/ConnectWalletButton";

export function Navbar() {
  const [search, setSearch] = useState("");
  const { setSearchQuery } = useUIStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center shrink-0">
          <img
            src="/assets/LyncLogo.svg"
            alt="Lync"
            className="h-8 w-auto"
          />
        </Link>

        <form onSubmit={handleSearch} className="flex flex-1 max-w-sm justify-center lg:max-w-md">
          <input
            type="search"
            placeholder="Search a prediction"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-border bg-neutral-bg/80 px-4 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-400/50"
          />
        </form>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/markets" className="text-sm text-white/90 hover:text-white">
            Markets
          </Link>
          <Link to="/portfolio" className="text-sm text-white/90 hover:text-white">
            Portfolio
          </Link>
          <Link to="/create" className="text-sm text-white/90 hover:text-white">
            Create
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
