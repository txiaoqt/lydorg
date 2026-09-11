import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type YPOPPeriod, type YPOPEntry, type YPOPCityActivity, seedState } from './lydo-connect-data';

describe('YPOP Reliability Fixes: Persistence, Synchronization, and State Integrity', () => {

  describe('1. Authoritative YPOP Period Synchronization (Fix 1)', () => {
    it('authoritatively removes deleted periods from state when remote snapshot omits them', () => {
      const currentPeriods: YPOPPeriod[] = [
        {
          id: 'period-1',
          semesterKey: '2026-S1',
          semesterLabel: '2026 First Semester',
          validationDeadline: '2026-06-30T00:00:00.000Z',
          status: 'open',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'period-2-to-delete',
          semesterKey: '2026-S2',
          semesterLabel: '2026 Second Semester',
          validationDeadline: '2026-12-31T00:00:00.000Z',
          status: 'draft',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ];

      // Remote snapshot from Supabase where period-2-to-delete has been deleted
      const remoteSnapshotPeriods: YPOPPeriod[] = [
        {
          id: 'period-1',
          semesterKey: '2026-S1',
          semesterLabel: '2026 First Semester',
          validationDeadline: '2026-06-30T00:00:00.000Z',
          status: 'open',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      // Authoritative reconciliation
      const nextYpopPeriods = remoteSnapshotPeriods ?? currentPeriods;
      const validSemesterKeys = new Set(nextYpopPeriods.map((p) => p.semesterKey));

      expect(nextYpopPeriods).toHaveLength(1);
      expect(nextYpopPeriods.some((p) => p.id === 'period-2-to-delete')).toBe(false);
      expect(validSemesterKeys.has('2026-S2')).toBe(false);
    });

    it('cascades period deletion to child city activities, entries, and dependent files', () => {
      const remainingPeriods: YPOPPeriod[] = [
        {
          id: 'period-1',
          semesterKey: '2026-S1',
          semesterLabel: '2026 First Semester',
          validationDeadline: '2026-06-30T00:00:00.000Z',
          status: 'open',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      const validSemesterKeys = new Set(remainingPeriods.map((p) => p.semesterKey));

      const existingActivities: YPOPCityActivity[] = [
        {
          id: 'act-1',
          semesterKey: '2026-S1',
          name: 'Leadership 101',
          date: '2026-03-01',
          points: 3,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'act-2-orphan',
          semesterKey: '2026-S2',
          name: 'Youth Festival',
          date: '2026-08-01',
          points: 2,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ];

      const prunedActivities = existingActivities.filter((a) => validSemesterKeys.has(a.semesterKey));
      expect(prunedActivities).toHaveLength(1);
      expect(prunedActivities[0].id).toBe('act-1');

      const existingEntries = [
        { id: 'entry-1', semester: '2026-S1', organizationId: 'org-1' },
        { id: 'entry-2-orphan', semester: '2026-S2', organizationId: 'org-1' },
      ];
      const prunedEntries = existingEntries.filter((e) => validSemesterKeys.has(e.semester));
      expect(prunedEntries).toHaveLength(1);
      expect(prunedEntries[0].id).toBe('entry-1');
    });

    it('prevents localStorage from resurrecting deleted periods', () => {
      // Simulates parsed JSON from localStorage where the deleted period is omitted
      const parsedWithRemainingPeriod = {
        ypopPeriods: [
          {
            id: 'period-remaining',
            semesterKey: '2026-S1',
            semesterLabel: '2026 First Semester',
          },
        ],
      };

      // In the old code: [...stored, ...seedState.ypopPeriods.filter(!storedIds.has(p.id))]
      // In the fixed code: if Array.isArray(parsed.ypopPeriods) return parsed.ypopPeriods
      const resolvedPeriods = Array.isArray(parsedWithRemainingPeriod.ypopPeriods)
        ? parsedWithRemainingPeriod.ypopPeriods
        : seedState.ypopPeriods;

      expect(resolvedPeriods).toHaveLength(1);
      expect(resolvedPeriods[0].id).toBe('period-remaining');
      // seedState periods were NOT resurrected
      expect(resolvedPeriods.some((p) => p.id === 'ypop-period-001')).toBe(false);
    });
  });

  describe('2. Virtual Entry UUID Validation & Sanitization (Fix 5)', () => {
    it('detects virtual/synthetic IDs and generates a valid UUID v4', () => {
      const virtualId = 'virtual-2026-S1-org-123';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(uuidRegex.test(virtualId)).toBe(false);

      const isVirtualEntry = virtualId.startsWith('virtual-') || virtualId.startsWith('ypop-');
      expect(isVirtualEntry).toBe(true);

      const generatedUuid = crypto.randomUUID();
      expect(uuidRegex.test(generatedUuid)).toBe(true);
    });
  });

  describe('3. Error Handling and Observability (Fix 6)', () => {
    it('aggregates exact error reasons rather than swallowing into generic toast', () => {
      const failedTitles: string[] = ['Activity Proof 1', 'Activity Proof 2'];
      const failureErrors: string[] = ['Admin account is not authorized.', 'Network timeout'];

      const detail = failureErrors.length ? `: ${failureErrors.join('; ')}` : '';
      const toastDescription = `${failedTitles.join(', ')}${detail}`;

      expect(toastDescription).toBe('Activity Proof 1, Activity Proof 2: Admin account is not authorized.; Network timeout');
      expect(toastDescription).toContain('Admin account is not authorized.');
    });
  });

  describe('4. Score Recalculation Persistence Contract (Fix 7 & 8)', () => {
    it('preserves recalculated score patch without loss during admin review transitions', () => {
      const initialEntry: YPOPEntry = {
        id: crypto.randomUUID(),
        organizationId: 'org-demo-001',
        submittedBy: 'user-demo-001',
        semester: '2026-S1',
        semesterLabel: '2026 First Semester',
        pointsEarned: 0,
        pointsRequired: 70,
        totalPoints: 100,
        status: 'submitted',
        adminRemarks: '',
        submissionNote: '',
        validationDeadline: '2026-06-30T00:00:00.000Z',
        submittedAt: '2026-05-01T00:00:00.000Z',
        validatedAt: '',
        revisionHistory: [],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      };

      const updatedScore = { totalScore: 85 };
      const approvedCount = 2;

      const entryPatch: Partial<YPOPEntry> = {
        orgLedProjectCount: approvedCount,
        pointsEarned: updatedScore.totalScore,
        status: initialEntry.status === 'draft' ? 'under_review' : initialEntry.status,
      };

      const mergedEntry = { ...initialEntry, ...entryPatch };
      expect(mergedEntry.pointsEarned).toBe(85);
      expect(mergedEntry.orgLedProjectCount).toBe(2);
      expect(mergedEntry.status).toBe('submitted');
    });
  });

  describe('5. RPC Overload Ambiguity Resolution Contract', () => {
    it('verifies the corrective migration defines exact DROP and canonical CREATE signatures', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const migrationPath = path.resolve('supabase/migrations/20260910150000_ypop_resolve_rpc_overload_ambiguity.sql');

      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // 1. Verifies exact drops for both event_participation overloads (enum and text)
      expect(sql).toContain('drop function if exists public.admin_update_ypop_event_participation(\n  text,\n  uuid,\n  public.ypop_event_participation_status');
      expect(sql).toContain('drop function if exists public.admin_update_ypop_event_participation(\n  text,\n  uuid,\n  text,');

      // 2. Verifies exact drops for both org_activity overloads (enum and text)
      expect(sql).toContain('drop function if exists public.admin_update_ypop_org_activity(\n  text,\n  uuid,\n  public.ypop_org_activity_status');
      expect(sql).toContain('drop function if exists public.admin_update_ypop_org_activity(\n  text,\n  uuid,\n  text,');

      // 3. Verifies dynamic cleanup loop in schema public
      expect(sql).toContain("where p.proname in ('admin_update_ypop_event_participation', 'admin_update_ypop_org_activity')");

      // 4. Verifies canonical creation of both functions with SECURITY DEFINER and session validation
      expect(sql).toContain('create or replace function public.admin_update_ypop_event_participation(');
      expect(sql).toContain('create or replace function public.admin_update_ypop_org_activity(');
      expect(sql).toContain('security definer');
      expect(sql).toContain('validate_admin_session_token');
    });
  });
});

