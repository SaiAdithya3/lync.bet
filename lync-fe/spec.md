You are a senior frontend engineer building the LyncBet frontend.

Goal:
Create a full React + TypeScript + TailwindCSS prediction market UI similar to Polymarket, using a modular architecture designed for hackathon development.

You must follow the exact architecture described below.

IMPORTANT RULES

1. Each component must live in its own file.
2. No large monolithic components.
3. Use Zustand for state management.
4. Use modular folders.
5. Use mock JSON data instead of APIs.
6. Build the UI so it can later connect to SSE realtime updates.
7. Use TailwindCSS only for styling.
8. The code should compile and run immediately.
9. Each step should create files sequentially.
10. Never combine unrelated features into one file.

Tech Stack

React
TypeScript
Vite
TailwindCSS
Zustand
Lightweight Charts
Framer Motion

Brand Colors

Primary Gradient

#010353 → #0048FF

YES color

#22C55E

NO color

#EF4444

Neutral Background

#020617

Card Background

#0F172A

Border

#1E293B

---

STEP 1

Initialize a Vite React TypeScript project.

Install dependencies:

react
react-dom
zustand
lightweight-charts
framer-motion
clsx

Install TailwindCSS and configure it.

Configure Tailwind to allow custom colors.

---

STEP 2

Create the folder structure inside src/

src/

app/
pages/
components/
layout/
market/
trade/
charts/
ui/
modals/

stores/

hooks/

services/

data/

types/

utils/

styles/

---

STEP 3

Create base types.

types/market.ts

Market type

types/trade.ts

Trade type

---

STEP 4

Create mock data files.

data/mockMarkets.json

data/mockTrades.json

data/mockChartData.json

data/mockActivity.json

Populate each with realistic dummy data.

---

STEP 5

Create Zustand stores.

stores/marketStore.ts

stores/tradeStore.ts

stores/walletStore.ts

stores/uiStore.ts

stores/chartStore.ts

Each store must include:

state
actions
initial state

Do not mix store domains.

---

STEP 6

Create utility functions.

utils/

format.ts
time.ts
probability.ts

Functions

formatCurrency
formatPercentage
timeRemaining
normalizeProbability

---

STEP 7

Create base UI primitives.

components/ui/

Button.tsx
Card.tsx
Input.tsx
Modal.tsx
Badge.tsx
Tabs.tsx

Each component must be reusable.

---

STEP 8

Create layout components.

components/layout/

Navbar.tsx
AppLayout.tsx

Navbar contains:

logo
navigation
market search
connect wallet button

---

STEP 9

Create wallet placeholder.

components/ui/ConnectWalletButton.tsx

Use walletStore.

Initially just simulate connection.

---

STEP 10

Create market components.

components/market/

MarketCard.tsx
MarketGrid.tsx
MarketHeader.tsx
ProbabilityBar.tsx

MarketCard shows

title
probability bar
YES/NO buttons
volume
participants

---

STEP 11

Create trade components.

components/trade/

TradePanel.tsx
SideSelector.tsx
AmountInput.tsx
PricePreview.tsx
SubmitTradeButton.tsx
OrderBook.tsx
PositionTable.tsx

---

STEP 12

Create chart system.

components/charts/

ProbabilityChart.tsx

Use Lightweight Charts.

Data must come from chartStore.

---

STEP 13

Create hooks.

hooks/

useMarkets.ts
useMarket.ts
useChartData.ts
useSSE.ts

useChartData should simulate realtime updates every 2 seconds.

---

STEP 14

Create modal system.

modals/

TradeModal.tsx
WalletModal.tsx
CreateMarketModal.tsx

Use uiStore to control open/close.

---

STEP 15

Create pages.

pages/

MarketExplorerPage.tsx
MarketDetailPage.tsx
CreateMarketPage.tsx
PortfolioPage.tsx
LeaderboardPage.tsx

---

STEP 16

Build MarketExplorerPage.

Layout:

Header
Search
Filters
MarketGrid
ActivityTicker

---

STEP 17

Build MarketDetailPage.

Layout:

MarketHeader
ProbabilityChart
TradePanel
OrderBook
PositionTable

---

STEP 18

Create ActivityTicker.

components/ui/ActivityTicker.tsx

Scrolling feed showing recent trades.

Use mockActivity.json.

---

STEP 19

Create services layer.

services/

marketService.ts
sseService.ts

marketService reads from mock JSON.

---

STEP 20

Create router.

app/router.tsx

Routes

/
markets
/market/:id
/create
/portfolio
/leaderboard

---

STEP 21

Wrap everything in AppLayout.

app/App.tsx

Use router.

---

STEP 22

Add responsive behavior.

Desktop

4-column market grid

Tablet

2 columns

Mobile

1 column

Trade panel moves below chart.

---

STEP 23

Add fake realtime behavior.

Charts update every 2 seconds.

Activity ticker updates randomly.

Market probabilities fluctuate slightly.

---

STEP 24

Ensure all components use Tailwind styling.

Use brand gradient where appropriate.

---

STEP 25

Verify the application runs using

npm run dev

Ensure:

Markets render
Charts update
Trades simulate
UI responsive

---

Final goal

A working Polymarket-style UI with:

market discovery
market trading interface
probability charts
realtime simulation
wallet placeholder
modular architecture
Zustand state management

Do not stop early.

Complete all steps sequentially.
