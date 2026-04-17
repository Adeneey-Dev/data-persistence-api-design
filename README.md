#  Data Persistence Profile Intelligence API

> A production-ready REST API that enriches a person's name with AI-powered demographic data — gender, age group, and nationality - sourced from three external APIs, persisted in PostgreSQL, and served through a clean, well-structured interface.

---

##  Live API

```
https://data-persistence-api-design-adeneey-dev178-xguy47zt.leapcell.dev
```

---

---

##  Live GET API

```
https://data-persistence-api-design-adeneey-dev178-xguy47zt.leapcell.dev/api/profiles
```

---


##  Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [API Endpoints](#-api-endpoints)
- [Classification Logic](#-classification-logic)
- [Error Handling](#-error-handling)
- [Running Locally](#-running-locally)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)

---

##  Overview

The **Profile Intelligence API** accepts a person's name and automatically:

1. Calls **Genderize.io** to predict gender and probability
2. Calls **Agify.io** to predict age
3. Calls **Nationalize.io** to predict nationality
4. Classifies the age into a human-readable group
5. Stores the result in a **PostgreSQL** database
6. Returns structured, consistent JSON on every request

Duplicate names are handled gracefully — submitting the same name twice returns the existing profile without hitting the external APIs again (**idempotent design**).

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Framework | [NestJS](https://nestjs.com/) (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL (hosted on [Supabase](https://supabase.com)) |
| ORM | TypeORM |
| Deployment | [Leapcell](https://leapcell.io) |
| ID Generation | UUID v4 |
| External APIs | Genderize, Agify, Nationalize |

---

##  Architecture

```
Client Request
      │
      ▼
 NestJS Controller  (/api/profiles)
      │
      ▼
 ProfilesService
      │
      ├──► Genderize API  (gender + probability)
      ├──► Agify API      (age)
      └──► Nationalize API (nationality)
              │
              ▼
       Classification Logic
       (age group, top country)
              │
              ▼
       PostgreSQL via TypeORM
              │
              ▼
       JSON Response (201 / 200)
```

---

##  API Endpoints

### Base URL
```
https://data-persistence-api-design-adeneey-dev178-xguy47zt.leapcell.dev
```

---

### 1. Create Profile
```http
POST /api/profiles
```

**Request Body:**
```json
{
  "name": "emmanuel"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 90212,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-17T12:00:00.000Z"
  }
}
```

**Duplicate Name Response (200 OK):**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { ...existing profile }
}
```

---

### 2. Get All Profiles
```http
GET /api/profiles
```

**Optional Query Filters (case-insensitive):**

| Parameter | Example |
|---|---|
| `gender` | `?gender=male` |
| `country_id` | `?country_id=NG` |
| `age_group` | `?age_group=adult` |

**Combined:** `/api/profiles?gender=male&country_id=NG&age_group=adult`

**Response (200 OK):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

---

### 3. Get Single Profile
```http
GET /api/profiles/:id
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "emmanuel",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 90212,
    "age": 25,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.85,
    "created_at": "2026-04-17T12:00:00.000Z"
  }
}
```

---

### 4. Delete Profile
```http
DELETE /api/profiles/:id
```

**Response:** `204 No Content`

---

##  Classification Logic

### Age Groups (from Agify)

| Age Range | Group |
|---|---|
| 0 – 12 | `child` |
| 13 – 19 | `teenager` |
| 20 – 59 | `adult` |
| 60+ | `senior` |

### Nationality (from Nationalize)
The country with the **highest probability** in the response array is selected as `country_id`.

---

##  Error Handling

All errors follow a consistent structure:

```json
{
  "status": "error",
  "message": "Description of what went wrong"
}
```

| Status Code | Meaning |
|---|---|
| `400` | Missing or empty name field |
| `404` | Profile not found |
| `422` | Invalid data type (name must be a string) |
| `502` | External API returned null/invalid data |
| `500` | Internal server error |

### 502 Edge Cases

| Scenario | Trigger |
|---|---|
| Genderize returns `gender: null` or `count: 0` | 502 — Genderize returned an invalid response |
| Agify returns `age: null` | 502 — Agify returned an invalid response |
| Nationalize returns empty country array | 502 — Nationalize returned an invalid response |

---

##  Running Locally

### Prerequisites
- Node.js v18+
- npm
- A PostgreSQL database (Supabase free tier works)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Adeneey-Dev/data-persistence-api-design.git

# 2. Navigate into the project
cd data-persistence-api-design

# 3. Install dependencies
npm install

# 4. Create your environment file
cp .env.example .env
# Fill in your DATABASE_URL in the .env file

# 5. Start in development mode
npm run start:dev
```

Server will be running at `http://localhost:3000`

---

##  Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=3000
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string |
| `PORT` | Port the server runs on (default: 3000) |

>  Never commit your `.env` file. It is already in `.gitignore`.

---

##  Deployment

This API is deployed on **Leapcell** with the following settings:

| Setting | Value |
|---|---|
| Framework | NestJS |
| Runtime | Node.js 20 (Debian) |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Database | Supabase PostgreSQL (Session Pooler) |

---

##  Project Structure

```
src/
├── app.module.ts          # Root module — DB config, CORS
├── main.ts                # Entry point — global prefix, CORS
└── profiles/
    ├── profile.entity.ts      # TypeORM entity (DB schema)
    ├── profiles.module.ts     # Feature module
    ├── profiles.controller.ts # Route handlers
    └── profiles.service.ts    # Business logic + external API calls
```

---

##  Author

**Adeneey Dev**
GitHub: [@Adeneey-Dev](https://github.com/Adeneey-Dev)

---

##  License

This project is open source and available under the [MIT License](LICENSE).