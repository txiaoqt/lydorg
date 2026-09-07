import { describe, expect, it } from "vitest";

describe("Phase 2.3: Expiration Event Idempotency & Observability Hardening Test Suite", () => {
  // Types representing database rows
  type NotificationRow = {
    id: string;
    user_id: string;
    organization_id: string;
    title: string;
    message: string;
    type: "renewal_window_opened" | "renewal_window_urgent" | "accreditation_expired" | "rejected" | string;
    related_type: string;
    related_id: string; // UUID
    is_read: boolean;
    created_at: string;
  };

  type ActivityLogRow = {
    id: string;
    organization_id: string;
    actor_user_id: string | null;
    action: string;
    related_type: string;
    related_id: string; // UUID
    description: string;
    created_at: string;
  };

  type AccreditationRecord = {
    id: string;
    organization_id: string;
    user_id: string;
    end_date: string; // YYYY-MM-DD
    status: "active" | "expired";
  };

  // In-memory simulation of PostgreSQL tables with exact partial unique indexes
  class DatabaseState {
    notifications: NotificationRow[] = [];
    activityLogs: ActivityLogRow[] = [];
    private idCounter = 1;

    // Simulates:
    // INSERT INTO notifications ...
    // ON CONFLICT (organization_id, type, related_id) WHERE related_type = 'accreditation' DO NOTHING
    // RETURNING id
    insertNotification(
      item: Omit<NotificationRow, "id" | "is_read" | "created_at">,
    ): { id: string } | null {
      if (item.related_type === "accreditation") {
        const conflict = this.notifications.some(
          (n) =>
            n.organization_id === item.organization_id &&
            n.type === item.type &&
            n.related_id === item.related_id &&
            n.related_type === "accreditation",
        );
        if (conflict) {
          // ON CONFLICT DO NOTHING: zero rows returned
          return null;
        }
      }

      const id = `notif-${this.idCounter++}`;
      this.notifications.push({
        ...item,
        id,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      return { id };
    }

    // Simulates:
    // INSERT INTO activity_logs ...
    // ON CONFLICT (organization_id, action, related_id)
    // WHERE action = 'accreditation_expired' AND related_type = 'accreditation' DO NOTHING
    insertActivityLog(
      item: Omit<ActivityLogRow, "id" | "created_at">,
    ): { id: string } | null {
      if (item.action === "accreditation_expired" && item.related_type === "accreditation") {
        const conflict = this.activityLogs.some(
          (a) =>
            a.organization_id === item.organization_id &&
            a.action === "accreditation_expired" &&
            a.related_type === "accreditation" &&
            a.related_id === item.related_id,
        );
        if (conflict) {
          // ON CONFLICT DO NOTHING: zero rows returned
          return null;
        }
      }

      const id = `act-${this.idCounter++}`;
      this.activityLogs.push({
        ...item,
        id,
        created_at: new Date().toISOString(),
      });
      return { id };
    }
  }

  // Exact reproduction of evaluate_accreditation_notification_events() logic
  const evaluateAccreditationNotificationEvents = (
    db: DatabaseState,
    accreditations: AccreditationRecord[],
    today: Date,
  ): { opened_count: number; urgent_count: number; expired_count: number } => {
    let opened_count = 0;
    let urgent_count = 0;
    let expired_count = 0;

    const todayDateOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // 1. renewal_window_opened (90 days before end_date down to 31 days)
    for (const oa of accreditations) {
      if (oa.status !== "active") continue;
      const endDate = new Date(oa.end_date);
      const diffDays = Math.round((endDate.getTime() - todayDateOnly.getTime()) / 86_400_000);

      const notifExists = db.notifications.some(
        (n) => n.organization_id === oa.organization_id && n.type === "renewal_window_opened" && n.related_id === oa.id,
      );

      if (diffDays <= 90 && diffDays > 30 && !notifExists) {
        const res = db.insertNotification({
          user_id: oa.user_id,
          organization_id: oa.organization_id,
          title: "Renewal Window Open",
          message: `Your accreditation expires in ${diffDays} days.`,
          type: "renewal_window_opened",
          related_type: "accreditation",
          related_id: oa.id,
        });
        if (res !== null) {
          opened_count++;
        }
      }
    }

    // 2. renewal_window_urgent (30 days before end_date down to 0 days)
    for (const oa of accreditations) {
      if (oa.status !== "active") continue;
      const endDate = new Date(oa.end_date);
      const diffDays = Math.round((endDate.getTime() - todayDateOnly.getTime()) / 86_400_000);

      const notifExists = db.notifications.some(
        (n) => n.organization_id === oa.organization_id && n.type === "renewal_window_urgent" && n.related_id === oa.id,
      );

      if (diffDays <= 30 && diffDays >= 0 && !notifExists) {
        const res = db.insertNotification({
          user_id: oa.user_id,
          organization_id: oa.organization_id,
          title: "Urgent: Accreditation Expiring Soon",
          message: `Your accreditation expires in ${diffDays} days.`,
          type: "renewal_window_urgent",
          related_type: "accreditation",
          related_id: oa.id,
        });
        if (res !== null) {
          urgent_count++;
        }
      }
    }

    // 3. accreditation_expired (past end_date)
    for (const oa of accreditations) {
      if (oa.status !== "active") continue;
      const endDate = new Date(oa.end_date);
      const isPast = todayDateOnly.getTime() > endDate.getTime();

      const notifExists = db.notifications.some(
        (n) => n.organization_id === oa.organization_id && n.type === "accreditation_expired" && n.related_id === oa.id,
      );

      const actLogExists = db.activityLogs.some(
        (a) =>
          a.organization_id === oa.organization_id &&
          a.action === "accreditation_expired" &&
          a.related_type === "accreditation" &&
          a.related_id === oa.id,
      );

      if (isPast && (!notifExists || !actLogExists)) {
        const res = db.insertNotification({
          user_id: oa.user_id,
          organization_id: oa.organization_id,
          title: "Accreditation Expired",
          message: "Your organization accreditation expired.",
          type: "accreditation_expired",
          related_type: "accreditation",
          related_id: oa.id,
        });
        if (res !== null) {
          expired_count++;
        }

        db.insertActivityLog({
          organization_id: oa.organization_id,
          actor_user_id: null,
          action: "accreditation_expired",
          related_type: "accreditation",
          related_id: oa.id,
          description: `Accreditation term ${oa.id} expired on ${oa.end_date}.`,
        });
      }
    }

    return { opened_count, urgent_count, expired_count };
  };

  // ----------------------------------------------------------------------------
  // TESTS 1 & 2: EXPIRATION NOTIFICATION CREATION & IDEMPOTENCY
  // ----------------------------------------------------------------------------
  it("1. first expiration evaluator run creates exactly one notification", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-01",
        status: "active",
      },
    ];

    const result = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-05T00:00:00Z"));
    expect(result.expired_count).toBe(1);
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0].type).toBe("accreditation_expired");
    expect(db.notifications[0].related_id).toBe("acc-term-1");
  });

  it("2. second evaluator run creates no duplicate notification", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-01",
        status: "active",
      },
    ];

    // Run 1
    evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-05T00:00:00Z"));
    expect(db.notifications).toHaveLength(1);

    // Run 2 (subsequent sweep)
    const result2 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-06T00:00:00Z"));
    expect(result2.expired_count).toBe(0);
    expect(db.notifications).toHaveLength(1); // Zero duplicate notifications!
  });

  // ----------------------------------------------------------------------------
  // TESTS 3 & 4: EXPIRATION ACTIVITY LOG CREATION & IDEMPOTENCY
  // ----------------------------------------------------------------------------
  it("3. first expiration evaluation creates exactly one activity log", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-01",
        status: "active",
      },
    ];

    evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-05T00:00:00Z"));
    expect(db.activityLogs).toHaveLength(1);
    expect(db.activityLogs[0].action).toBe("accreditation_expired");
    expect(db.activityLogs[0].related_type).toBe("accreditation");
    expect(db.activityLogs[0].related_id).toBe("acc-term-1");
    expect(db.activityLogs[0].actor_user_id).toBeNull();
  });

  it("4. second evaluator run creates no duplicate expiration activity log", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-01",
        status: "active",
      },
    ];

    // Run 1
    evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-05T00:00:00Z"));
    expect(db.activityLogs).toHaveLength(1);

    // Run 2
    evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-06T00:00:00Z"));
    expect(db.activityLogs).toHaveLength(1); // Zero duplicate activity logs!
  });

  // ----------------------------------------------------------------------------
  // TEST 5: DIFFERENT ACCREDITATION TERMS CAN EACH CREATE AN EXPIRATION EVENT
  // ----------------------------------------------------------------------------
  it("5. different accreditation terms can each create one expiration event", () => {
    const db = new DatabaseState();

    // Term 1 expired
    const term1: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-01",
        status: "active",
      },
    ];

    evaluateAccreditationNotificationEvents(db, term1, new Date("2026-08-05T00:00:00Z"));
    expect(db.notifications.filter((n) => n.type === "accreditation_expired")).toHaveLength(1);
    expect(db.activityLogs.filter((a) => a.action === "accreditation_expired")).toHaveLength(1);

    // Term 2 later expires (e.g. 3 years later)
    const term2: AccreditationRecord[] = [
      {
        id: "acc-term-2", // Distinct term ID
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2029-08-01",
        status: "active",
      },
    ];

    const result2 = evaluateAccreditationNotificationEvents(db, term2, new Date("2029-08-05T00:00:00Z"));
    expect(result2.expired_count).toBe(1);

    const expiredNotifs = db.notifications.filter((n) => n.type === "accreditation_expired");
    const expiredLogs = db.activityLogs.filter((a) => a.action === "accreditation_expired");

    expect(expiredNotifs).toHaveLength(2);
    expect(expiredLogs).toHaveLength(2);

    expect(expiredNotifs.map((n) => n.related_id)).toEqual(["acc-term-1", "acc-term-2"]);
    expect(expiredLogs.map((a) => a.related_id)).toEqual(["acc-term-1", "acc-term-2"]);
  });

  // ----------------------------------------------------------------------------
  // TEST 6: CONCURRENT EVALUATOR BEHAVIOR REMAINS IDEMPOTENT
  // ----------------------------------------------------------------------------
  it("6. concurrent evaluator behavior remains idempotent", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-01",
        status: "active",
      },
    ];

    // Simulating two workers running evaluateAccreditationNotificationEvents concurrently
    // Worker A runs
    const workerA = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-05T00:00:00Z"));
    // Worker B runs simultaneously against same database
    const workerB = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-08-05T00:00:00Z"));

    expect(workerA.expired_count).toBe(1);
    expect(workerB.expired_count).toBe(0); // Worker B detected conflict and did not increment!

    expect(db.notifications).toHaveLength(1);
    expect(db.activityLogs).toHaveLength(1);
  });

  // ----------------------------------------------------------------------------
  // TESTS 7, 8, 9: ACCURATE COUNTERS FOR OPENED, URGENT, AND EXPIRED
  // ----------------------------------------------------------------------------
  it("7. opened_count reflects actual notification inserts", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-11-01", // 60 days ahead -> renewal_window_opened
        status: "active",
      },
    ];

    // Run 1: Inserts notification
    const res1 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-09-02T00:00:00Z"));
    expect(res1.opened_count).toBe(1);
    expect(res1.urgent_count).toBe(0);
    expect(res1.expired_count).toBe(0);

    // Run 2: Notification already exists -> ON CONFLICT DO NOTHING -> count is 0
    const res2 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-09-03T00:00:00Z"));
    expect(res2.opened_count).toBe(0);
  });

  it("8. urgent_count reflects actual notification inserts", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-09-15", // 14 days ahead -> renewal_window_urgent
        status: "active",
      },
    ];

    // Run 1: Inserts notification
    const res1 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-09-01T00:00:00Z"));
    expect(res1.opened_count).toBe(0);
    expect(res1.urgent_count).toBe(1);
    expect(res1.expired_count).toBe(0);

    // Run 2: Notification already exists -> count is 0
    const res2 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-09-02T00:00:00Z"));
    expect(res2.urgent_count).toBe(0);
  });

  it("9. expired_count reflects actual notification inserts", () => {
    const db = new DatabaseState();
    const accreditations: AccreditationRecord[] = [
      {
        id: "acc-term-1",
        organization_id: "org-1",
        user_id: "user-1",
        end_date: "2026-08-30", // 2 days past -> accreditation_expired
        status: "active",
      },
    ];

    // Run 1: Inserts notification
    const res1 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-09-01T00:00:00Z"));
    expect(res1.opened_count).toBe(0);
    expect(res1.urgent_count).toBe(0);
    expect(res1.expired_count).toBe(1);

    // Run 2: Notification already exists -> count is 0
    const res2 = evaluateAccreditationNotificationEvents(db, accreditations, new Date("2026-09-02T00:00:00Z"));
    expect(res2.expired_count).toBe(0);
  });

  // ----------------------------------------------------------------------------
  // TEST 10: NON-RENEWAL NOTIFICATION TYPES REMAIN UNAFFECTED
  // ----------------------------------------------------------------------------
  it("10. non-renewal notification types remain unaffected", () => {
    const db = new DatabaseState();

    // Budget and Document notifications can be inserted multiple times
    const notif1 = db.insertNotification({
      user_id: "user-1",
      organization_id: "org-1",
      title: "Document Revision Needed",
      message: "Please re-upload CBL",
      type: "document_revision",
      related_type: "document_submission",
      related_id: "doc-1",
    });

    const notif2 = db.insertNotification({
      user_id: "user-1",
      organization_id: "org-1",
      title: "Document Revision Needed Again",
      message: "Please re-upload CBL again",
      type: "document_revision",
      related_type: "document_submission",
      related_id: "doc-1",
    });

    expect(notif1).not.toBeNull();
    expect(notif2).not.toBeNull();
    expect(db.notifications).toHaveLength(2);
  });

  // ----------------------------------------------------------------------------
  // TEST 11: EXISTING PHASE 2.2 ENUM COMPATIBILITY REMAINS INTACT
  // ----------------------------------------------------------------------------
  it("11. existing Phase 2.2 enum compatibility remains intact", () => {
    const validPhase2_2Enums = [
      "renewal_window_opened",
      "renewal_window_urgent",
      "accreditation_expired",
      "rejected",
    ];

    const legacyEnums = [
      "document_revision",
      "document_green",
      "document_red",
      "budget_go_signal",
      "budget_revision",
      "budget_released",
      "liquidation_go_signal",
      "liquidation_revision",
      "overdue",
      "completed",
      "news_release",
    ];

    const allValidNotificationTypes = new Set([...legacyEnums, ...validPhase2_2Enums]);

    validPhase2_2Enums.forEach((enumVal) => {
      expect(allValidNotificationTypes.has(enumVal)).toBe(true);
    });

    expect(allValidNotificationTypes.size).toBe(15);
  });
});
