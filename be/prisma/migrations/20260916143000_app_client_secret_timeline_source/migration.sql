ALTER TABLE "applications" ADD COLUMN "clientSecretHash" TEXT;

ALTER TABLE "timeline_events" ADD COLUMN "source_app" TEXT;
ALTER TABLE "timeline_events" ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "timeline_events_idempotency_key_key" ON "timeline_events"("idempotency_key");
CREATE INDEX "timeline_events_source_app_idx" ON "timeline_events"("source_app");
