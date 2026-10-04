# ⚡ CryptX Frontend - Modern Crypto Trading Web App

A high-performance, responsive, real-time cryptocurrency trading and portfolio management web application built with **React 19**, **TypeScript**, **Vite**, **TradingView Lightweight Charts**, **Framer Motion**, and **TanStack React Query**.

Designed to connect with the **CryptX Spring Boot Backend**, it delivers live price updates, interactive charting, instant buy/sell trading, wallet top-ups via **Razorpay**, and seamless session management with automatic JWT refresh and CSRF protection.

---

## ✨ Features

### 📈 Interactive Market Data & TradingView Charts
- **Live Tickers & Markets Overview**: Searchable and paginated list of top cryptocurrencies with real-time price updates, 24-hour change %, volume, and market capitalization.
- **TradingView Charts**: Powered by `lightweight-charts` for interactive price history and candlestick analysis.
- **Instant Buy / Sell Widget**: Simplified order execution with live balance validation, fiat currency conversion (USD/INR), and header-based idempotency key generation.

### 💼 Portfolio & Wallet Operations
- **Portfolio Analytics**: Holdings breakdown, live profit & loss (PnL) tracking, and asset allocation visuals.
- **Razorpay Payment Integration**: Integrated Razorpay web checkout for seamless wallet fiat deposits.
- **Transaction Ledger**: Paginated wallet transaction history logging deposits, withdrawals, buys, and sells with `SUCCESS`, `PENDING`, or `FAILED` statuses.

### 🔐 Authentication & Session Security
- **Dual Authentication**: Native email/password signup & login alongside Google OAuth2 integration.
- **Automated Token Refreshing**: Custom `apiFetch` client interceptor that automatically handles `401 Unauthorized` responses by fetching new JWT access tokens in the background.
- **CSRF Token Sync**: Automatic extraction and header submission (`X-XSRF-TOKEN`) of backend CSRF cookies.
- **Social User Password Setup**: Smart password setup prompt modal for users registering via Google OAuth2.

### 🎨 UI & UX Features
- **Framer Motion Animations**: Smooth page transitions, modals, and dynamic layout animations.
- **Responsive Theme**: Dark-themed, modern financial dashboard UI tailored for desktop, tablet, and mobile screens.
- **Instant Feedback**: Toast notifications powered by `react-hot-toast` for trades, errors, and system alerts.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework & Runtime** | React 19, TypeScript 5.9, Vite 7 (SWC plugin) |
| **Routing** | React Router 7 (`react-router-dom`) |
| **State & Data Fetching** | TanStack React Query v5, Axios, Custom `apiFetch` wrapper |
| **Charting** | TradingView Lightweight Charts 5.2 |
| **Animations & Icons** | Framer Motion 12, Lucide React Icons |
| **Forms & Validation** | React Hook Form |
| **Notifications** | React Hot Toast |
| **Payment Gateway** | Razorpay Web Checkout Integration |

---

## 📂 Project Structure

```
Crypto-Fe/
├── index.html                      # HTML entry point
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build & dev server config
├── public/                         # Static assets & favicons
└── src/
    ├── App.tsx                     # Main layout & router configuration
    ├── main.tsx                    # React application root entry point
    ├── index.css                   # Global CSS styles & typography
    ├── assets/                     # Images & brand assets
    ├── components/                 # Reusable UI components
    │   ├── CryptoChart/            # TradingView canvas wrapper component
    │   └── CryptoIcon/             # Dynamic crypto currency badge loader
    ├── features/                   # Feature-sliced modules
    │   ├── auth/                   # Authentication & Public pages
    │   │   ├── BuyCrypto/          # Buy/Sell order widget
    │   │   ├── CoinDetail/         # Crypto detail view with live charts
    │   │   ├── Home/               # Landing page hero & top coins market overview
    │   │   ├── Login/              # Login form component
    │   │   ├── Markets/            # Full crypto market explorer page
    │   │   ├── Navbar/             # Top navigation bar & user avatar dropdown
    │   │   ├── OAuth2RedirectHandler/# Google OAuth2 callback receiver
    │   │   ├── ResetPassword/      # Password reset token handler
    │   │   ├── SetPassword/        # OAuth user password setup modal
    │   │   └── Signup/             # User registration form
    │   └── user/                   # User account & portfolio pages
    │       ├── Portfolio/          # Portfolio asset allocation & valuation
    │       ├── Profile/            # User settings & wallet manager modal
    │       └── WalletHistory/      # Paginated transaction ledger
    └── utils/                      # Utilities & API helpers
        ├── api.ts                  # Custom fetch wrapper (Auto JWT refresh & CSRF)
        └── csrf.ts                 # Browser cookie extraction helper
```

---

## ⚙️ Environment Setup

Create a `.env` file in the root directory (`Crypto-Fe/.env`):

```env
# Backend API Base URL
VITE_BACKEND_URL=http://localhost:8080

# Razorpay Client Key ID (for wallet top-ups)
VITE_RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id
```

---

## 🚦 Getting Started

### 1. Install Dependencies

```bash
npm install
```

---

### 2. Start Development Server

Run Vite dev server with hot module replacement (HMR):

```bash
npm run dev
```

App will be accessible at `http://localhost:5173`.

---

### 3. Build for Production

Compile TypeScript and build optimized static assets:

```bash
npm run build
```

---

### 4. Preview Production Build

Preview the production output locally:

```bash
npm run preview
```

---

## 📡 Backend Integration Specs

The frontend communicates with the **CryptX Spring Boot Backend** over REST and WebSockets:

- **Auth Session Check**: `GET /auth/check`
- **Token Refresh Interceptor**: `POST /auth/refresh`
- **CSRF Token Handling**: Automatic cookie extraction & `X-XSRF-TOKEN` header injection for `POST`/`PUT`/`DELETE` requests.
- **Idempotency Guard**: Auto-generates unique `Idempotency-Key` headers for all trade transactions (`/trade/buy-sell`).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
