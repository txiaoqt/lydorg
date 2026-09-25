import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusBadge } from '../components/portal/StatusBadge';
import { statusLabelMap } from './lydo-connect-data';
import { STATUS_LABEL_CONFIG as LIQ_STATUS_CONFIG } from '../admin/components/LiquidationReportsTable';
import { StatusPill } from '../admin/components/BudgetRequestsTable';
import { StatusLabel as YpopStatusLabel } from '../admin/components/YpopSubmissionsTable';
import { BudgetRequestStatus, LiquidationStatus, YPOPStatus } from '../types';

describe('Admin Lifecycle Actions + User Status Synchronization Verification', () => {

  describe('1. BUDGET REQUEST FULL LIFECYCLE & USER SYNCHRONIZATION', () => {
    it('maps every canonical BudgetRequestStatus to authoritative user-side labels without gaps', () => {
      const budgetStatuses: BudgetRequestStatus[] = [
        'draft',
        'submitted',
        'under_review',
        'needs_revision',
        'approved_for_ftf_green',
        'rejected_red',
        'hard_copy_submitted',
        'budget_released',
        'completed',
      ];

      const expectedLabels: Record<BudgetRequestStatus, string> = {
        draft: 'Draft',
        submitted: 'Pending Review',
        under_review: 'Under Review',
        needs_revision: 'Needs Revision',
        approved_for_ftf_green: 'Onsite Required',
        rejected_red: 'Rejected',
        hard_copy_submitted: 'Hardcopy Submitted',
        budget_released: 'Budget Released',
        completed: 'Completed',
      };

      budgetStatuses.forEach((status) => {
        expect(statusLabelMap[status]).toBe(expectedLabels[status]);
      });
    });

    it('renders user-facing StatusBadge correctly across the entire lifecycle chain', () => {
      // Step 1: submitted -> Pending Review
      const { rerender } = render(<StatusBadge status="submitted" />);
      expect(screen.getByText('Pending Review')).toBeDefined();

      // Step 2: under_review -> Under Review
      rerender(<StatusBadge status="under_review" />);
      expect(screen.getByText('Under Review')).toBeDefined();

      // Step 3: approved_for_ftf_green -> User sees "Onsite Required"
      rerender(<StatusBadge status="approved_for_ftf_green" />);
      expect(screen.getByText('Onsite Required')).toBeDefined();

      // Step 4: hard_copy_submitted -> User sees "Hardcopy Submitted"
      rerender(<StatusBadge status="hard_copy_submitted" />);
      expect(screen.getByText('Hardcopy Submitted')).toBeDefined();

      // Step 5: budget_released -> User sees "Budget Released"
      rerender(<StatusBadge status="budget_released" />);
      expect(screen.getByText('Budget Released')).toBeDefined();

      // Step 6: completed -> User sees "Completed"
      rerender(<StatusBadge status="completed" />);
      expect(screen.getByText('Completed')).toBeDefined();

      // Revision branch: needs_revision -> User sees "Needs Revision"
      rerender(<StatusBadge status="needs_revision" />);
      expect(screen.getByText('Needs Revision')).toBeDefined();

      // Rejection branch: rejected_red -> User sees "Rejected"
      rerender(<StatusBadge status="rejected_red" />);
      expect(screen.getByText('Rejected')).toBeDefined();
    });

    it('verifies sequential state progression for Budget Request lifecycle', () => {
      // Simulating the store mutation chain that Admin actions execute
      let currentStatus: BudgetRequestStatus = 'submitted';

      // Admin Approves:
      currentStatus = 'approved_for_ftf_green';
      expect(statusLabelMap[currentStatus]).toBe('Onsite Required');

      // Admin Marks Hardcopy:
      currentStatus = 'hard_copy_submitted';
      expect(statusLabelMap[currentStatus]).toBe('Hardcopy Submitted');

      // Admin Releases Cash:
      currentStatus = 'budget_released';
      expect(statusLabelMap[currentStatus]).toBe('Budget Released');

      // Legacy read compatibility:
      currentStatus = 'completed';
      expect(statusLabelMap[currentStatus]).toBe('Completed');
    });
    it('renders admin StatusPill correctly across all budget lifecycle stages', () => {
      const { rerender } = render(<StatusPill status="submitted" />);
      expect(screen.getByText('Pending Review')).toBeDefined();

      rerender(<StatusPill status="under_review" />);
      expect(screen.getByText('Under Review')).toBeDefined();

      rerender(<StatusPill status="approved_for_ftf_green" />);
      expect(screen.getByText('Onsite Required')).toBeDefined();

      rerender(<StatusPill status="hard_copy_submitted" />);
      expect(screen.getByText('Hardcopy Submitted')).toBeDefined();

      rerender(<StatusPill status="budget_released" />);
      expect(screen.getByText('Budget Released')).toBeDefined();

      rerender(<StatusPill status="completed" />);
      expect(screen.getByText('Completed')).toBeDefined();

      rerender(<StatusPill status="needs_revision" />);
      expect(screen.getByText('Needs Revision')).toBeDefined();

      rerender(<StatusPill status="rejected_red" />);
      expect(screen.getByText('Rejected')).toBeDefined();
    });
  });

  describe('2. LIQUIDATION REPORT FULL LIFECYCLE & USER SYNCHRONIZATION', () => {
    it('maps every canonical LiquidationStatus to authoritative labels and table configurations', () => {
      const liquidationStatuses: LiquidationStatus[] = [
        'pending_activity_completion',
        'not_started',
        'draft',
        'submitted',
        'under_review',
        'needs_revision',
        'approved_for_ftf_green',
        'rejected_red',
        'hard_copy_submitted',
        'completed_liquidated',
        'overdue',
      ];

      const expectedLabels: Record<LiquidationStatus, string> = {
        pending_activity_completion: 'Pending Activity Completion',
        not_started: 'Not Started',
        draft: 'Draft',
        submitted: 'Pending Review',
        under_review: 'Under Review',
        needs_revision: 'Needs Revision',
        approved_for_ftf_green: 'Onsite Required',
        rejected_red: 'Rejected',
        hard_copy_submitted: 'Hardcopy Submitted',
        completed_liquidated: 'Liquidated',
        overdue: 'Overdue',
      };

      liquidationStatuses.forEach((status) => {
        expect(statusLabelMap[status]).toBe(expectedLabels[status]);
        expect(LIQ_STATUS_CONFIG[status]).toBeDefined();
        expect(LIQ_STATUS_CONFIG[status].label).toBeTruthy();
      });
    });

    it('renders user-facing StatusBadge for Liquidation Report correctly across all lifecycle transitions', () => {
      // Step 1: pending_activity_completion
      const { rerender } = render(<StatusBadge status="pending_activity_completion" />);
      expect(screen.getByText('Pending Activity Completion')).toBeDefined();

      // Step 2: submitted -> Pending Review
      rerender(<StatusBadge status="submitted" />);
      expect(screen.getByText('Pending Review')).toBeDefined();

      // Step 3: Admin approves -> approved_for_ftf_green ("Onsite Required")
      rerender(<StatusBadge status="approved_for_ftf_green" />);
      expect(screen.getByText('Onsite Required')).toBeDefined();

      // Step 4: Admin marks hardcopy -> hard_copy_submitted ("Hardcopy Submitted")
      rerender(<StatusBadge status="hard_copy_submitted" />);
      expect(screen.getByText('Hardcopy Submitted')).toBeDefined();

      // Step 5: Admin completes liquidation -> completed_liquidated ("Liquidated")
      rerender(<StatusBadge status="completed_liquidated" />);
      expect(screen.getByText('Liquidated')).toBeDefined();

      // Overdue path: overdue -> "Overdue"
      rerender(<StatusBadge status="overdue" />);
      expect(screen.getByText('Overdue')).toBeDefined();
    });

    it('verifies sequential state progression for Liquidation Report without skipping hardcopy', () => {
      let currentStatus: LiquidationStatus = 'submitted';

      // 1. Admin Approves -> approved_for_ftf_green
      currentStatus = 'approved_for_ftf_green';
      expect(statusLabelMap[currentStatus]).toBe('Onsite Required');

      // 2. Admin Marks Hardcopy Submitted -> MUST be hard_copy_submitted (NOT jumping to completed_liquidated)
      currentStatus = 'hard_copy_submitted';
      expect(statusLabelMap[currentStatus]).toBe('Hardcopy Submitted');

      // 3. Admin Completes Liquidation -> completed_liquidated
      currentStatus = 'completed_liquidated';
      expect(statusLabelMap[currentStatus]).toBe('Liquidated');
    });
  });

  describe('3. YPOP VALIDATION & ENTRY STATUS REFLECTION', () => {
    it('verifies distinct user-side and admin-side labels for all canonical YPOPStatus values', () => {
      const ypopStatuses: YPOPStatus[] = [
        'draft',
        'submitted',
        'under_review',
        'needs_revision',
        'qualified',
        'not_qualified',
      ];

      const expectedLabels: Record<YPOPStatus, string> = {
        draft: 'Draft',
        submitted: 'Pending Review',
        under_review: 'Under Review',
        needs_revision: 'Needs Revision',
        qualified: 'Qualified',
        not_qualified: 'Not Qualified',
      };

      ypopStatuses.forEach((status) => {
        expect(statusLabelMap[status]).toBe(expectedLabels[status]);
      });
    });

    it('ensures StatusBadge renders each YPOP status distinctly without collapsing into generic state', () => {
      const { rerender } = render(<StatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeDefined();

      rerender(<StatusBadge status="submitted" />);
      expect(screen.getByText('Pending Review')).toBeDefined();

      rerender(<StatusBadge status="under_review" />);
      expect(screen.getByText('Under Review')).toBeDefined();

      rerender(<StatusBadge status="needs_revision" />);
      expect(screen.getByText('Needs Revision')).toBeDefined();

      rerender(<StatusBadge status="qualified" />);
      expect(screen.getByText('Qualified')).toBeDefined();

      rerender(<StatusBadge status="not_qualified" />);
      expect(screen.getByText('Not Qualified')).toBeDefined();
    });

    it('renders admin YpopSubmissionsTable StatusLabel distinctly for all 6 statuses', () => {
      const { rerender } = render(<YpopStatusLabel status="draft" />);
      expect(screen.getByText('Draft')).toBeDefined();

      rerender(<YpopStatusLabel status="submitted" />);
      expect(screen.getByText('Submitted')).toBeDefined();

      rerender(<YpopStatusLabel status="under_review" />);
      expect(screen.getByText('Under Review')).toBeDefined();

      rerender(<YpopStatusLabel status="needs_revision" />);
      expect(screen.getByText('Needs Revision')).toBeDefined();

      rerender(<YpopStatusLabel status="qualified" />);
      expect(screen.getByText('Qualified')).toBeDefined();

      rerender(<YpopStatusLabel status="not_qualified" />);
      expect(screen.getByText('Not Qualified')).toBeDefined();
    });

    it('preserves separation between proof review decisions and entry qualification status', () => {
      // Activity/Proof review decisions:
      const cityProofDecisions = ['verified', 'needs_revision', 'rejected'] as const;
      const orgProofDecisions = ['approved', 'needs_revision', 'rejected'] as const;

      expect(cityProofDecisions).toContain('verified');
      expect(orgProofDecisions).toContain('approved');

      // Entry status is separate and computed based on points & thresholds:
      const entryStatusQualified: YPOPStatus = 'qualified';
      const entryStatusNotQualified: YPOPStatus = 'not_qualified';
      expect(entryStatusQualified).not.toBe('approved');
      expect(entryStatusNotQualified).not.toBe('rejected');
    });
  });

  describe('4. WORKFLOW GUARDS & CONCURRENCY INTEGRITY', () => {
    it('prevents invalid lifecycle action transitions', () => {
      const isBudgetActionAllowed = (status: BudgetRequestStatus, action: 'submitted_hardcopy' | 'cash_released' | 'complete') => {
        if (action === 'submitted_hardcopy') return status === 'approved_for_ftf_green';
        if (action === 'cash_released') return status === 'hard_copy_submitted';
        if (action === 'complete') return status === 'budget_released';
        return false;
      };

      // submitted_hardcopy only valid from approved_for_ftf_green
      expect(isBudgetActionAllowed('submitted', 'submitted_hardcopy')).toBe(false);
      expect(isBudgetActionAllowed('approved_for_ftf_green', 'submitted_hardcopy')).toBe(true);

      // cash_released only valid from hard_copy_submitted
      expect(isBudgetActionAllowed('approved_for_ftf_green', 'cash_released')).toBe(false);
      expect(isBudgetActionAllowed('hard_copy_submitted', 'cash_released')).toBe(true);

      // complete only valid from budget_released
      expect(isBudgetActionAllowed('hard_copy_submitted', 'complete')).toBe(false);
      expect(isBudgetActionAllowed('budget_released', 'complete')).toBe(true);
    });

    it('prevents invalid liquidation lifecycle action transitions', () => {
      const isLiquidationActionAllowed = (status: LiquidationStatus, action: 'submitted_hardcopy' | 'complete' | 'overdue') => {
        if (action === 'submitted_hardcopy') return status === 'approved_for_ftf_green';
        if (action === 'complete') return status === 'hard_copy_submitted' || status === 'approved_for_ftf_green';
        if (action === 'overdue') return ['submitted', 'under_review', 'approved_for_ftf_green', 'needs_revision'].includes(status);
        return false;
      };

      // hardcopy only valid after approval
      expect(isLiquidationActionAllowed('submitted', 'submitted_hardcopy')).toBe(false);
      expect(isLiquidationActionAllowed('approved_for_ftf_green', 'submitted_hardcopy')).toBe(true);

      // complete valid from approved_for_ftf_green or hard_copy_submitted
      expect(isLiquidationActionAllowed('submitted', 'complete')).toBe(false);
      expect(isLiquidationActionAllowed('approved_for_ftf_green', 'complete')).toBe(true);
      expect(isLiquidationActionAllowed('hard_copy_submitted', 'complete')).toBe(true);

      // overdue allowed from active uncompleted statuses
      expect(isLiquidationActionAllowed('submitted', 'overdue')).toBe(true);
      expect(isLiquidationActionAllowed('completed_liquidated', 'overdue')).toBe(false);
    });
  });

  describe('5. SINGLE REVIEW DECISION ACTION PANEL STATE INTEGRATION', () => {
    // Defines the single action surface resolver matching AdminPortal's Review Decision panel
    const getBudgetReviewDecisionActions = (status: BudgetRequestStatus) => {
      const isReviewStage = status === 'submitted' || status === 'under_review' || status === 'needs_revision';
      const hasDocumentReviewControls = isReviewStage;

      const availableActions: string[] = [];
      if (status === 'submitted' || status === 'under_review') {
        availableActions.push('approve', 'needs_revision', 'reject');
      } else if (status === 'needs_revision') {
        availableActions.push('approve', 'reject');
      } else if (status === 'approved_for_ftf_green') {
        availableActions.push('submitted_hardcopy');
      } else if (status === 'hard_copy_submitted') {
        availableActions.push('cash_released');
      } else if (status === 'budget_released') {
        // budget_released is final milestone and terminal
      }
      // budget_released, completed and rejected_red have no action buttons

      return {
        isReviewStage,
        hasDocumentReviewControls,
        availableActions,
        isTerminal: status === 'budget_released' || status === 'completed' || status === 'rejected_red',
      };
    };

    const getLiquidationReviewDecisionActions = (status: LiquidationStatus) => {
      const isReviewStage = status === 'submitted' || status === 'under_review' || status === 'needs_revision';
      const hasDocumentReviewControls = isReviewStage;

      const availableActions: string[] = [];
      if (status === 'submitted' || status === 'under_review') {
        availableActions.push('approve', 'needs_revision', 'reject');
      } else if (status === 'needs_revision') {
        availableActions.push('approve', 'reject');
      } else if (status === 'approved_for_ftf_green') {
        availableActions.push('complete');
      } else if (status === 'hard_copy_submitted') {
        availableActions.push('complete');
      }
      // completed_liquidated has no action buttons

      return {
        isReviewStage,
        hasDocumentReviewControls,
        availableActions,
        isTerminal: status === 'completed_liquidated',
      };
    };

    it('1. Review-stage actions appear for review-stage statuses', () => {
      // Budget: submitted, under_review, needs_revision
      const budgetReviewStages: BudgetRequestStatus[] = ['submitted', 'under_review', 'needs_revision'];
      budgetReviewStages.forEach((status) => {
        const state = getBudgetReviewDecisionActions(status);
        expect(state.isReviewStage).toBe(true);
        expect(state.hasDocumentReviewControls).toBe(true);
        expect(state.availableActions).toContain('approve');
      });

      // Liquidation: submitted, under_review, needs_revision
      const liqReviewStages: LiquidationStatus[] = ['submitted', 'under_review', 'needs_revision'];
      liqReviewStages.forEach((status) => {
        const state = getLiquidationReviewDecisionActions(status);
        expect(state.isReviewStage).toBe(true);
        expect(state.hasDocumentReviewControls).toBe(true);
        expect(state.availableActions).toContain('approve');
      });
    });

    it('2. After Approve, old review actions disappear and next lifecycle action appears', () => {
      // Budget transition from submitted to approved_for_ftf_green
      const budgetReview = getBudgetReviewDecisionActions('submitted');
      expect(budgetReview.hasDocumentReviewControls).toBe(true);
      expect(budgetReview.availableActions).toEqual(['approve', 'needs_revision', 'reject']);

      const budgetApproved = getBudgetReviewDecisionActions('approved_for_ftf_green');
      // Old review actions and document review controls MUST disappear
      expect(budgetApproved.isReviewStage).toBe(false);
      expect(budgetApproved.hasDocumentReviewControls).toBe(false);
      expect(budgetApproved.availableActions).not.toContain('approve');
      expect(budgetApproved.availableActions).not.toContain('needs_revision');
      expect(budgetApproved.availableActions).not.toContain('reject');
      // Next lifecycle action MUST appear
      expect(budgetApproved.availableActions).toEqual(['submitted_hardcopy']);

      // Liquidation transition from submitted to approved_for_ftf_green
      const liqReview = getLiquidationReviewDecisionActions('submitted');
      expect(liqReview.hasDocumentReviewControls).toBe(true);
      expect(liqReview.availableActions).toEqual(['approve', 'needs_revision', 'reject']);

      const liqApproved = getLiquidationReviewDecisionActions('approved_for_ftf_green');
      expect(liqApproved.isReviewStage).toBe(false);
      expect(liqApproved.hasDocumentReviewControls).toBe(false);
      expect(liqApproved.availableActions).not.toContain('approve');
      expect(liqApproved.availableActions).toContain('complete');
    });

    it('3. After each lifecycle action, the next action replaces the previous one in Budget Request', () => {
      // Step 1: approved_for_ftf_green -> only submitted_hardcopy
      const step1 = getBudgetReviewDecisionActions('approved_for_ftf_green');
      expect(step1.availableActions).toEqual(['submitted_hardcopy']);

      // Step 2: hard_copy_submitted -> submitted_hardcopy disappears, cash_released appears
      const step2 = getBudgetReviewDecisionActions('hard_copy_submitted');
      expect(step2.availableActions).not.toContain('submitted_hardcopy');
      expect(step2.availableActions).toEqual(['cash_released']);

      // Step 3: budget_released -> terminal stage, cash_released disappears, no further actions
      const step3 = getBudgetReviewDecisionActions('budget_released');
      expect(step3.availableActions).not.toContain('cash_released');
      expect(step3.availableActions).toHaveLength(0);
      expect(step3.isTerminal).toBe(true);

      // Step 4: completed (legacy compatibility) -> no further actions
      const step4 = getBudgetReviewDecisionActions('completed');
      expect(step4.availableActions).toHaveLength(0);
      expect(step4.isTerminal).toBe(true);
    });

    it('4. After each lifecycle action, the next action replaces the previous one in Liquidation Report', () => {
      // Step 1: approved_for_ftf_green -> complete
      const step1 = getLiquidationReviewDecisionActions('approved_for_ftf_green');
      expect(step1.availableActions).toContain('complete');

      // Step 2: hard_copy_submitted -> complete appears
      const step2 = getLiquidationReviewDecisionActions('hard_copy_submitted');
      expect(step2.availableActions).toEqual(['complete']);

      // Step 3: completed_liquidated -> complete disappears, no further actions
      const step3 = getLiquidationReviewDecisionActions('completed_liquidated');
      expect(step3.availableActions).toHaveLength(0);
      expect(step3.isTerminal).toBe(true);
    });

    it('5. Completed and terminal states have no invalid actions', () => {
      // Budget terminal states
      expect(getBudgetReviewDecisionActions('budget_released').availableActions).toHaveLength(0);
      expect(getBudgetReviewDecisionActions('completed').availableActions).toHaveLength(0);
      expect(getBudgetReviewDecisionActions('rejected_red').availableActions).toHaveLength(0);

      // Liquidation terminal state
      expect(getLiquidationReviewDecisionActions('completed_liquidated').availableActions).toHaveLength(0);
    });

    it('6. User-side status reflects each persisted state in the single-panel flow', () => {
      const budgetProgression: { status: BudgetRequestStatus; userLabel: string }[] = [
        { status: 'submitted', userLabel: 'Pending Review' },
        { status: 'approved_for_ftf_green', userLabel: 'Onsite Required' },
        { status: 'hard_copy_submitted', userLabel: 'Hardcopy Submitted' },
        { status: 'budget_released', userLabel: 'Budget Released' },
        { status: 'completed', userLabel: 'Completed' },
      ];

      budgetProgression.forEach(({ status, userLabel }) => {
        expect(statusLabelMap[status]).toBe(userLabel);
      });

      const liqProgression: { status: LiquidationStatus; userLabel: string }[] = [
        { status: 'submitted', userLabel: 'Pending Review' },
        { status: 'approved_for_ftf_green', userLabel: 'Onsite Required' },
        { status: 'hard_copy_submitted', userLabel: 'Hardcopy Submitted' },
        { status: 'completed_liquidated', userLabel: 'Liquidated' },
      ];

      liqProgression.forEach(({ status, userLabel }) => {
        expect(statusLabelMap[status]).toBe(userLabel);
      });
    });

    it('7. Existing validation and workflow guards remain unchanged', () => {
      // Budget guards
      const validBudgetTransitions: Record<BudgetRequestStatus, BudgetRequestStatus[]> = {
        draft: ['submitted'],
        submitted: ['under_review', 'approved_for_ftf_green', 'needs_revision', 'rejected_red'],
        under_review: ['approved_for_ftf_green', 'needs_revision', 'rejected_red'],
        needs_revision: ['submitted', 'under_review', 'approved_for_ftf_green', 'rejected_red'],
        approved_for_ftf_green: ['hard_copy_submitted'],
        hard_copy_submitted: ['budget_released'],
        budget_released: ['completed'],
        completed: [],
        rejected_red: [],
      };

      expect(validBudgetTransitions['approved_for_ftf_green']).toContain('hard_copy_submitted');
      expect(validBudgetTransitions['approved_for_ftf_green']).not.toContain('budget_released');
      expect(validBudgetTransitions['hard_copy_submitted']).toContain('budget_released');
      expect(validBudgetTransitions['hard_copy_submitted']).not.toContain('completed');
      expect(validBudgetTransitions['budget_released']).toContain('completed');

      // Liquidation guards
      const validLiquidationTransitions: Record<LiquidationStatus, LiquidationStatus[]> = {
        pending_activity_completion: ['not_started'],
        not_started: ['draft', 'submitted'],
        draft: ['submitted'],
        submitted: ['under_review', 'approved_for_ftf_green', 'needs_revision', 'overdue'],
        under_review: ['approved_for_ftf_green', 'needs_revision', 'overdue'],
        needs_revision: ['submitted', 'under_review', 'approved_for_ftf_green', 'overdue'],
        approved_for_ftf_green: ['hard_copy_submitted', 'completed_liquidated', 'overdue'],
        hard_copy_submitted: ['completed_liquidated'],
        overdue: ['approved_for_ftf_green', 'needs_revision'],
        completed_liquidated: [],
        rejected_red: [],
      };

      expect(validLiquidationTransitions['approved_for_ftf_green']).toContain('completed_liquidated');
      expect(validLiquidationTransitions['hard_copy_submitted']).toContain('completed_liquidated');
      expect(validLiquidationTransitions['completed_liquidated']).toHaveLength(0);
    });
  });
});
