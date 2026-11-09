# Internship test fixtures

Integration fixtures use a unique collection prefix per test file and are
created only against `INTERNSHIP_TEST_MONGODB_URI`. No fixture can fall back
to the runtime database. Shared protocol fixtures belong in the contract
tests so the public envelopes remain explicit.
