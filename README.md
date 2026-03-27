# 🏡 StayBD — Full Stack Rental & Service Marketplace

<p align="center">
  <b>A multi-role, full-stack platform inspired by modern booking systems like Airbnb — tailored for Bangladesh.</b>
</p>

<p align="center">
  🚀 Properties • 🎯 Experiences • 🛠 Services • 💳 Payments • 💬 Real-time Chat • 📊 Analytics
</p>

---

## 📌 Overview

**StayBD** is a scalable full-stack web application that enables users to explore, book, and manage **properties, services, and experiences** in a unified platform.

Unlike basic CRUD apps, StayBD implements:

- Multi-role system (Guest, Host, Provider, Admin)
- Real-time communication
- Payment processing
- Modular backend architecture
- Analytics dashboards

---

## ✨ Key Features

### 👤 Role-Based System

| Role                 | Capabilities                      |
| -------------------- | --------------------------------- |
| **Guest**            | Browse, book, chat, review        |
| **Host**             | Manage properties, track bookings |
| **Service Provider** | Offer services & experiences      |
| **Admin**            | Manage platform & analytics       |

---

### 🧩 Core Functionalities

- 🏠 Property listing & booking system
- 🎯 Experience & service marketplace
- 💬 Real-time chat (Socket.IO)
- 💳 Stripe payment integration
- 🗺️ Map-based search (Leaflet)
- ⭐ Review & rating system
- ❤️ Wishlist system
- 📊 Role-based analytics dashboards
- 🔐 Authentication & authorization system
- 📦 Basic recommendation engine

---

## 🏗️ System Architecture

```
Frontend (React + Vite)
        │
        ▼
API Layer (Express.js)
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
DB   Services   Realtime
(MongoDB) (Logic) (Socket.IO)
```

---

## 🧠 Tech Stack

### 🎨 Frontend

- React (Vite)
- Tailwind CSS
- Zustand (State Management)
- React Router
- Axios
- Leaflet (Maps)
- Socket.IO Client
- Stripe.js

---

### ⚙️ Backend

- Node.js + Express
- MongoDB + Mongoose
- Firebase Admin SDK
- Cloudinary (Image Upload)
- Stripe API
- Socket.IO
- Express Validator
- Helmet, Rate Limiting

---

## 📁 Project Structure

```
StayBD/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── seeds/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── services/
│   │   └── utils/
│   └── index.html
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 🔽 Clone Repository

```bash
git clone https://github.com/your-username/staybd.git
cd staybd
```

---

## 🔐 Environment Variables

### 🌐 Frontend (`frontend/.env`)

```env
# Firebase (Client)
VITE_FIREBASE_API_KEY=********
VITE_FIREBASE_AUTH_DOMAIN=********
VITE_FIREBASE_PROJECT_ID=********
VITE_FIREBASE_STORAGE_BUCKET=********
VITE_FIREBASE_MESSAGING_SENDER_ID=********
VITE_FIREBASE_APP_ID=********

# API
VITE_API_URL=http://localhost:5000/api

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=********
```

---

### ⚙️ Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=********
DB_NAME=********

# Frontend
FRONTEND_URL=http://localhost:5173

# Auth
JWT_SECRET=********

# Firebase Admin
FIREBASE_PROJECT_ID=********
FIREBASE_PRIVATE_KEY_ID=********
FIREBASE_PRIVATE_KEY="********"
FIREBASE_CLIENT_EMAIL=********
FIREBASE_CLIENT_ID=********

# Stripe
STRIPE_SECRET_KEY=********
STRIPE_WEBHOOK_SECRET=********

# Cloudinary
CLOUDINARY_CLOUD_NAME=********
CLOUDINARY_API_KEY=********
CLOUDINARY_API_SECRET=********
```

---

## ▶️ Run the Project

### Backend

```bash
cd backend
npm install
npm run dev
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌱 Seed Database

```bash
cd backend
npm run seed
```

---

## 🔌 API Structure

```
/api/users
/api/properties
/api/bookings
/api/services
/api/experiences
/api/reviews
/api/payments
/api/chat
/api/admin
/api/analytics
```

---

## 💬 Real-Time System

- Built with **Socket.IO**
- Supports:
  - Live chat
  - Event-based communication
  - Scalable socket handling via utility layer

---

## 🔐 Security Features

- JWT Authentication
- Role-based access control
- Rate limiting
- Input validation & sanitization
- Secure headers (Helmet)

---

## 📊 Analytics

- Booking trends
- Revenue insights
- Role-specific dashboards
- User activity tracking

---

## ⚠️ Limitations

- Recommendation system is rule-based (not ML-driven)
- No automated testing implemented yet
- Stripe in test mode

---

## 🚀 Future Improvements

- AI-based recommendation engine
- Advanced filtering & search
- Microservices architecture
- Mobile app version

---

## 👨‍💻 Author

**Md. Jahid Hasan Jitu**
CSE — Green University of Bangladesh

---

## 📄 License

ISC License
