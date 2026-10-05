-- Exact, organization-scoped dashboard metrics without downloading full histories.
-- This migration is intentionally forward-only and is not deployed by this change.

CREATE OR REPLACE FUNCTION public.get_organization_portal_dashboard_summary(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.organization_profiles AS profile
    WHERE profile.id = p_organization_id
      AND profile.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Organization dashboard is not authorized.' USING ERRCODE = '42501';
  END IF;

  WITH budget_stats AS (
    SELECT
      count(*) AS total_count,
      count(*) FILTER (WHERE request.status::text = 'budget_released') AS released_count,
      count(*) FILTER (WHERE request.status::text IN ('submitted', 'under_review')) AS under_review_count,
      count(*) FILTER (WHERE request.status::text = 'needs_revision') AS revision_count,
      count(*) FILTER (WHERE request.status::text = 'draft') AS draft_count,
      count(*) FILTER (WHERE request.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted')) AS awaiting_release_count,
      COALESCE(SUM(
        CASE WHEN request.status::text = 'budget_released'
          THEN COALESCE(NULLIF(request.released_amount, 0), NULLIF(request.approved_amount, 0), request.requested_amount, 0)
          ELSE 0
        END
      ), 0) AS released_amount
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
  ),
  eligible_liquidations AS (
    SELECT report.*, budget.activity_title
    FROM public.liquidation_reports AS report
    JOIN public.budget_requests AS budget
      ON budget.id = report.budget_request_id
     AND budget.organization_id = p_organization_id
     AND budget.status::text = 'budget_released'
    WHERE report.organization_id = p_organization_id
  ),
  liquidation_stats AS (
    SELECT
      count(*) AS total_count,
      count(*) FILTER (WHERE report.status::text IN ('completed_liquidated', 'approved')) AS completed_count,
      count(*) FILTER (WHERE report.status::text IN ('submitted', 'under_review', 'hard_copy_submitted', 'approved_for_ftf_green')) AS under_review_count,
      count(*) FILTER (WHERE report.status::text IN ('needs_revision', 'rejected_red')) AS revision_count,
      count(*) FILTER (
        WHERE report.status::text = 'overdue'
          OR (report.status::text IN ('not_started', 'draft', 'needs_revision', 'rejected_red') AND report.deadline_at < now())
      ) AS overdue_count,
      count(*) FILTER (WHERE report.status::text IN ('not_started', 'draft', 'pending_activity_completion')) AS pending_upload_count,
      (
        count(*) FILTER (WHERE report.status::text IN ('not_started', 'draft', 'needs_revision', 'overdue'))
        + (
          SELECT count(*)
          FROM public.budget_requests AS budget
          WHERE budget.organization_id = p_organization_id
            AND budget.status::text = 'budget_released'
            AND NOT EXISTS (
              SELECT 1
              FROM public.liquidation_reports AS missing_report
              WHERE missing_report.budget_request_id = budget.id
                AND missing_report.organization_id = p_organization_id
            )
        )
      ) AS pending_action_count,
      min(report.deadline_at) FILTER (
        WHERE report.status::text IN ('not_started', 'draft', 'needs_revision', 'rejected_red', 'overdue')
          AND report.deadline_at >= now()
      ) AS next_deadline
    FROM eligible_liquidations AS report
  ),
  latest_budget AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
    ORDER BY request.created_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_budget_revision AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
      AND request.status::text = 'needs_revision'
    ORDER BY request.updated_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_awaiting_release_budget AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
      AND request.status::text IN ('awaiting_release', 'approved_for_ftf_green', 'hard_copy_submitted')
    ORDER BY request.updated_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_pending_budget AS (
    SELECT jsonb_build_object(
      'id', request.id,
      'activity_title', request.activity_title,
      'status', request.status::text,
      'admin_remarks', request.admin_remarks,
      'created_at', request.created_at
    ) AS record
    FROM public.budget_requests AS request
    WHERE request.organization_id = p_organization_id
      AND request.status::text IN ('submitted', 'draft')
    ORDER BY request.updated_at DESC, request.id DESC
    LIMIT 1
  ),
  latest_attention_liquidation AS (
    SELECT jsonb_build_object(
      'id', report.id,
      'budget_request_id', report.budget_request_id,
      'activity_title', report.activity_title,
      'status', report.status::text,
      'remarks', report.remarks,
      'deadline_at', report.deadline_at,
      'created_at', report.created_at
    ) AS record
    FROM eligible_liquidations AS report
    WHERE report.status::text IN ('needs_revision', 'rejected_red', 'overdue', 'not_started', 'draft')
    ORDER BY
      CASE WHEN report.status::text IN ('needs_revision', 'rejected_red', 'overdue') THEN 0 ELSE 1 END,
      report.created_at DESC,
      report.id DESC
    LIMIT 1
  ),
  latest_unsubmitted_liquidation AS (
    SELECT jsonb_build_object(
      'budget_request_id', budget.id,
      'activity_title', budget.activity_title,
      'status', 'not_started'
    ) AS record
    FROM public.budget_requests AS budget
    WHERE budget.organization_id = p_organization_id
      AND budget.status::text = 'budget_released'
      AND NOT EXISTS (
        SELECT 1 FROM public.liquidation_reports AS report
        WHERE report.budget_request_id = budget.id
          AND report.organization_id = p_organization_id
      )
    ORDER BY budget.updated_at DESC, budget.id DESC
    LIMIT 1
  ),
  latest_under_review_liquidation AS (
    SELECT jsonb_build_object(
      'id', report.id,
      'budget_request_id', report.budget_request_id,
      'activity_title', report.activity_title,
      'status', report.status::text,
      'remarks', report.remarks,
      'deadline_at', report.deadline_at,
      'created_at', report.created_at
    ) AS record
    FROM eligible_liquidations AS report
    WHERE report.status::text IN ('submitted', 'under_review', 'hard_copy_submitted', 'approved_for_ftf_green')
    ORDER BY report.created_at DESC, report.id DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'budgets', jsonb_build_object(
      'total_count', budget_stats.total_count,
      'released_count', budget_stats.released_count,
      'under_review_count', budget_stats.under_review_count,
      'revision_count', budget_stats.revision_count,
      'draft_count', budget_stats.draft_count,
      'awaiting_release_count', budget_stats.awaiting_release_count,
      'released_amount', budget_stats.released_amount,
      'status_counts', COALESCE((
        SELECT jsonb_object_agg(status_counts.status, status_counts.count)
        FROM (
          SELECT request.status::text AS status, count(*) AS count
          FROM public.budget_requests AS request
          WHERE request.organization_id = p_organization_id
          GROUP BY request.status::text
        ) AS status_counts
      ), '{}'::jsonb)
    ),
    'liquidations', jsonb_build_object(
      'total_count', liquidation_stats.total_count,
      'completed_count', liquidation_stats.completed_count,
      'under_review_count', liquidation_stats.under_review_count,
      'revision_count', liquidation_stats.revision_count,
      'overdue_count', liquidation_stats.overdue_count,
      'pending_upload_count', liquidation_stats.pending_upload_count,
      'pending_action_count', liquidation_stats.pending_action_count,
      'next_deadline', liquidation_stats.next_deadline,
      'status_counts', COALESCE((
        SELECT jsonb_object_agg(status_counts.status, status_counts.count)
        FROM (
          SELECT report.status::text AS status, count(*) AS count
          FROM eligible_liquidations AS report
          GROUP BY report.status::text
        ) AS status_counts
      ), '{}'::jsonb)
    ),
    'latest_budget', (SELECT record FROM latest_budget),
    'latest_budget_revision', (SELECT record FROM latest_budget_revision),
    'latest_awaiting_release_budget', (SELECT record FROM latest_awaiting_release_budget),
    'latest_pending_budget', (SELECT record FROM latest_pending_budget),
    'latest_attention_liquidation', (SELECT record FROM latest_attention_liquidation),
    'latest_unsubmitted_liquidation', (SELECT record FROM latest_unsubmitted_liquidation),
    'latest_under_review_liquidation', (SELECT record FROM latest_under_review_liquidation)
  )
  INTO v_result
  FROM budget_stats
  CROSS JOIN liquidation_stats;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_organization_portal_dashboard_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_portal_dashboard_summary(uuid) TO authenticated;
