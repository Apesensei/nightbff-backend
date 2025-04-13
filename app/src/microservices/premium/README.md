# Premium Module

## 1. Purpose

Manages user subscription status, premium features, and potentially payment integration.

## 2. Key Components

<!-- TODO: Populate with actual components -->
- **Entities:**
  - `Subscription.entity.ts`: Tracks user subscription details (status, tier, dates).
- **Services:**
  - `PremiumService.ts`: Logic for checking premium status, activating features.
- **Repositories:**
  - `SubscriptionRepository.ts`: Database interaction for subscriptions.
- **DTOs:**
  - `dto/...`: Data transfer objects for subscription status.

## 3. API Endpoints (If Applicable)

<!-- TODO: Add endpoints if any are directly exposed -->
- `GET /premium/status`: Check the current user's premium status.
- Potentially endpoints for initiating/managing subscriptions (e.g., via Stripe webhook).

## 4. Dependencies

- **Internal Modules:**
  - `AuthModule`: To link subscriptions to users.
- **External Libraries:**
  - `TypeORM`: For database interaction.
  - Potentially a payment provider library (e.g., Stripe SDK).
- **External Services:**
  - Payment Gateway (e.g., Stripe).

## 5. Testing

Tests for this module are located in `src/microservices/premium/tests/`.

Run all tests for this module:
```bash
npm test -- --testPathPattern=src/microservices/premium
```

## 6. Environment Variables

<!-- TODO: Add specific env vars -->
- `PAYMENT_PROVIDER_SECRET_KEY`: Secret key for the payment gateway.
- `PAYMENT_PROVIDER_WEBHOOK_SECRET`: Secret for validating webhooks.

## 7. Notes / Design Decisions

- Actual implementation details depend heavily on the chosen payment provider.
- Feature gating based on premium status might be handled here or within individual feature modules checking status via this service. 