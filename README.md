# Rent Easy 🏡

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Nigeria's most trusted property rental and sale marketplace.**

Rent Easy is a revolutionary real estate platform designed for the Nigerian market. It addresses the lack of trust between tenants, landlords, and agents through a secure escrow payment system, verified listings, and a transparent inspection booking process.

---

## 📸 Screenshots

*(Add screenshots here)*

---

## ✨ Features

- **🛡️ Safe Deal Escrow**: Payments are held securely by Rent Easy and only released after a successful inspection and confirmation.
- **📍 Map-Based Search**: Integrated Google Maps for intuitive property discovery by location.
- **🤳 Verified Listings**: Multi-tier verification for Landlords and Agents (LASRERA, NIN check).
- **📅 Inspection Booking**: Secure inspection fee management with Paystack.
- **💬 Real-time Communication**: Instant chat between tenants and property owners.
- **🏗️ Land & House Categories**: Specialized listing flows for both built properties and undeveloped land.
- **⚖️ Dispute Resolution**: Dedicated system for handling inspection disputes and landlord strikes.
- **🔔 Smart Notifications**: Real-time app notifications and email alerts via Resend.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion.
- **Backend / Database**: Supabase (PostgreSQL), Row Level Security (RLS).
- **Edge Functions**: Deno (deployed on Supabase).
- **Payments**: Paystack API integration.
- **Maps**: Google Maps Platform.
- **Icons**: Lucide React.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- A Supabase project

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/rent-easy.git
   cd rent-easy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**:
   Run the contents of `supabase-blueprint.sql` in your Supabase SQL Editor to set up tables, enums, triggers, and RLS policies.

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 🔑 Environment Variables

| Variable | Description | Source |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous API key | Supabase Dashboard |
| `VITE_GOOGLE_MAPS_API_KEY` | API Key for Maps and Places | Google Cloud Console |
| `VITE_PAYSTACK_PUBLIC_KEY` | Public Key for payment popup | Paystack Dashboard |

---

## 📁 Folder Structure

```
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React Context (Auth)
│   ├── hooks/           # Custom React hooks (Data fetching)
│   ├── lib/             # Third-party service clients (Supabase, Paystack)
│   ├── pages/           # Main application routes
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Helper functions
├── supabase/
│   └── functions/       # Deno Edge Functions
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
└── supabase-blueprint.sql # Database schema
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Contact

- **Email**: joinrenteasy@gmail.com
- **Twitter**: [@Renteasyapp](https://x.com/Renteasyapp)
