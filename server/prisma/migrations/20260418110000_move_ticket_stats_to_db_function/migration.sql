CREATE OR REPLACE FUNCTION get_ticket_dashboard_stats()
RETURNS TABLE (
  "totalTickets" INTEGER,
  "openTickets" INTEGER,
  "resolvedTickets" INTEGER,
  "aiResolvedTickets" INTEGER,
  "aiResolvedPercentage" DOUBLE PRECISION,
  "averageResolutionMs" DOUBLE PRECISION,
  "ticketVolumeByDay" JSONB
)
LANGUAGE sql
STABLE
AS $$
  WITH summary AS (
    SELECT
      COUNT(*)::int AS total_tickets,
      COUNT(*) FILTER (
        WHERE status IN ('new', 'processing', 'open')
      )::int AS open_tickets,
      COUNT(*) FILTER (
        WHERE "resolvedAt" IS NOT NULL
          AND status IN ('resolved', 'closed')
      )::int AS resolved_tickets,
      COUNT(*) FILTER (
        WHERE "resolvedAt" IS NOT NULL
          AND status IN ('resolved', 'closed')
          AND EXISTS (
            SELECT 1
            FROM "ticket_reply" reply
            WHERE reply."ticketId" = ticket.id
              AND reply.source = 'ai_auto_resolution'
          )
      )::int AS ai_resolved_tickets,
      AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) * 1000)
        FILTER (WHERE "resolvedAt" IS NOT NULL)::double precision AS average_resolution_ms
    FROM "ticket" ticket
  ),
  volume AS (
    SELECT
      day_series.day::date AS day,
      COUNT(ticket.id)::int AS total_tickets
    FROM generate_series(
      CURRENT_DATE - INTERVAL '29 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS day_series(day)
    LEFT JOIN "ticket" ticket
      ON ticket."createdAt" >= day_series.day
     AND ticket."createdAt" < day_series.day + INTERVAL '1 day'
    GROUP BY day_series.day
    ORDER BY day_series.day ASC
  )
  SELECT
    summary.total_tickets AS "totalTickets",
    summary.open_tickets AS "openTickets",
    summary.resolved_tickets AS "resolvedTickets",
    summary.ai_resolved_tickets AS "aiResolvedTickets",
    CASE
      WHEN summary.resolved_tickets = 0 THEN 0
      ELSE (summary.ai_resolved_tickets::double precision / summary.resolved_tickets::double precision) * 100
    END AS "aiResolvedPercentage",
    summary.average_resolution_ms AS "averageResolutionMs",
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date',
            to_char(volume.day, 'YYYY-MM-DD'),
            'totalTickets',
            volume.total_tickets
          )
          ORDER BY volume.day
        )
        FROM volume
      ),
      '[]'::jsonb
    ) AS "ticketVolumeByDay"
  FROM summary;
$$;
