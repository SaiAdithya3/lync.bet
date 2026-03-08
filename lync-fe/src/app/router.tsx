import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { TradeModal } from "../components/modals/TradeModal";
import { WalletModal } from "../components/modals/WalletModal";
import { CreateMarketModal } from "../components/modals/CreateMarketModal";
import { ToastContainer } from "../components/ui/ToastContainer";
import { MarketExplorerPage } from "./pages/MarketExplorerPage";
import { MarketDetailPage } from "./pages/MarketDetailPage";
import { CreateMarketPage } from "./pages/CreateMarketPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";

function RootLayout() {
  return (
    <>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <TradeModal />
      <WalletModal />
      <CreateMarketModal />
      <ToastContainer />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/markets" replace /> },
      { path: "markets", element: <MarketExplorerPage /> },
      { path: "market/:id", element: <MarketDetailPage /> },
      { path: "create", element: <CreateMarketPage /> },
      { path: "portfolio", element: <PortfolioPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
    ],
  },
]);

export function LyncBetRouter() {
  return <RouterProvider router={router} />;
}

export { router };
