# AuthLab Phases 1 and 2: What, How and Why

A walkthrough of the local lab built for the AuthLab portfolio project.

## The big picture

Authentication has two sides: the **issuer** (the identity provider, which proves who you are and hands out tokens) and the **resource server** (the API, which checks the token on every request).

- **Phase 1** uses a real, production-grade issuer (Keycloak) and builds the API side.
- **Phase 2** builds a tiny issuer yourself, so you understand what Keycloak does internally and can break it safely.

That order means you have seen the real thing first, and Phase 2 then explains how it works.

Status: Phase 2 is tested (16 tests pass). Phase 1's Docker stack has not been run yet, so expect small fixes the first time you start it.

## Phase 1: real identity provider and a protected API

**What we built:** `docker-compose.yml` with three services (Postgres, Keycloak and a Flask API), plus `.env.example`, `.gitignore` and a README with the Keycloak setup steps.

### Why each piece exists

- **Keycloak** is an open-source identity provider that speaks OAuth 2.0 and OpenID Connect, and it is widely used in enterprises. It handles login, users, roles, token signing and later Google and GitHub federation.
- **Postgres** lets Keycloak's configuration survive restarts. Dev mode defaults to an embedded database, which is fine for a quick test and less convincing as a project.
- **The Flask API** is the resource server. It never sees passwords. It only receives a token and decides whether to trust it. Keeping authentication and API separate is the core architectural idea.

### Safe defaults, on purpose

- A pinned image version, so builds are repeatable.
- Ports bound to `127.0.0.1`, so nothing is exposed to your network.
- Secrets in `.env`, which is git-ignored.
- The API container runs as a non-root user.
- `start-dev` mode is labeled as development-only.

### How the API validates a token (`api/app.py`)

1. Read `Authorization: Bearer <token>`. If it is missing, return 401.
2. Read the `kid` (key ID) from the token header.
3. Fetch Keycloak's public keys from its JWKS URL (cached).
4. Verify the RS256 signature.
5. Check the issuer (`iss`), audience (`aud`) and expiry (`exp`), and require those claims to be present.
6. Read roles from `realm_access.roles`. If the role is wrong, return 403.

**Why RS256, not HS256:** with RS256 (asymmetric), Keycloak signs with a private key and the API only needs the public key, so a compromised API cannot mint tokens. With HS256 every verifier holds the same secret that can also sign.

**Why an algorithm allow-list:** the API accepts only `RS256` and never believes the token's own `alg` header. Phase 2 shows what happens without it.

**Why 401 vs 403:** 401 means the server cannot trust who you are (missing, expired or forged token). 403 means it knows you and the answer is no.

### The Keycloak setup, and why

| Step | Why |
| --- | --- |
| Realm `authlab` | A realm is an isolated tenant of users, roles and clients |
| Roles and two users | Gives you a viewer and an admin to test 403 |
| Public client `authlab-web`, PKCE S256 | Browser-style clients cannot keep a secret, so PKCE protects the code |
| Direct access grants (lab only) | A shortcut to get tokens with curl; the real flow comes in Phase 3 |
| Audience mapper `authlab-api` | Tells Keycloak to put your API in the token's `aud` |

### Gotchas worth writing about

- **Issuer vs. JWKS hostnames.** The token's `iss` is `localhost:8080` because that is the URL you used, but the API fetches keys from `keycloak:8080` over the Docker network. That is why the compose file has two separate settings.
- **A missing audience mapper** causes `InvalidAudienceError`, which is the audience check working.

## Phase 2: build and break your own JWT issuer

**What we built:** the `jwtlab/` folder with `auth.py`, `app.py`, 16 tests, a README and pytest config.

**Why:** using Keycloak teaches you configuration. Building a mini issuer teaches you what is actually in a token and what a verifier must check.

### KeyStore

Holds RSA keys by `kid` and supports rotation (a new current key) and retirement (dropping an old one). Its JWKS output contains public keys only, which a test confirms by checking that no private `d` value is published.

### issue\_token

Creates a token with these claims:

- `iss`: who issued it
- `aud`: who it is for
- `sub`: who it is about
- `roles`: what they can do
- `iat` and `exp`: issued-at and expiry
- `jti`: a unique token ID

Passing `None` for a claim removes it, which is how the tests build broken tokens.

### The secure verifier

Fixes the algorithm to RS256, looks up the key by `kid` and rejects unknown ones, then checks signature, issuer, audience and expiry, with required claims enforced.

### The deliberately vulnerable verifier

It believes the token's `alg` header, and it shows two classic bugs:

1. **`alg: none`:** the attacker claims the token needs no signature, and the naive server accepts it.
2. **Key confusion:** the attacker takes your public key (it is published in the JWKS), signs a token with HS256 using that public key as the HMAC secret, and sets the header to HS256. The naive server then treats its own public key as the HMAC secret and accepts it. The fix is to pin the algorithm.

### What the tests prove

| Attack | Defense |
| --- | --- |
| Expired or missing `exp` | `exp` required and checked |
| Wrong audience or issuer | `aud` and `iss` pinned |
| Edit role without re-signing | The signature covers the payload |
| Sign with attacker's key | Verify only against the issuer's keys |
| Unknown `kid` | Reject, never fall back |
| `alg: none` and HS256 confusion | Fixed algorithm allow-list |
| Rotation | Old tokens work while the old key is published, and fail once it is retired |

Rotation needs an overlap window: if you swap keys instantly, every live token breaks.

### The HTTP layer

- `/token` for demo logins, with hashed passwords
- `/.well-known/jwks.json` for the public keys
- `/api/me` and `/api/admin`, which return 401, 403 or 200 depending on the token

## How the phases connect

Phase 1 shows the real-world pattern: an issuer, a public key endpoint and an API validating tokens. Phase 2 opens the box and shows why each validation step exists. In Phase 3, Keycloak and your client will exchange tokens through the full Authorization Code + PKCE flow.

## Interview talking points

- Why RS256 over HS256 for distributed systems.
- Why you pin algorithms, and the `alg: none` and key-confusion attacks.
- The difference between authentication and authorization (401 vs 403).
- Why audience and issuer checks stop token reuse across services.
- Key rotation with an overlap window.
