-- Cal.com webhook integration: track the originating booking so replayed/duplicate
-- webhook deliveries (BOOKING_CREATED fired twice, retries, etc.) don't create
-- duplicate lessons. Idempotent — safe to re-run.

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS calcom_booking_id text;

CREATE UNIQUE INDEX IF NOT EXISTS lessons_calcom_booking_id_key
  ON public.lessons (calcom_booking_id)
  WHERE calcom_booking_id IS NOT NULL;
