# Environment notes

Do not create or rename production secrets from this handover without inspecting the repository.

Likely integrations from the existing House Dark project history include:

- Cloudflare D1 / Drizzle product data
- Cloudflare R2 media storage
- existing hosted identity in the review environment
- possible Supabase email OTP for public identity
- movie metadata provider
- LLM provider for editorial draft generation
- email provider for operational / lifecycle messages

All API keys remain server side.

If adding new variables, update the repository's `.env.example` with names only and no secrets.
