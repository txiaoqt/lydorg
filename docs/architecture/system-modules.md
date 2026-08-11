# System Modules Inventory & Architecture Reference

**Date Generated**: August 3, 2026  
**Primary Source of Truth**: `src/App.tsx`, `src/user/UserPortal.tsx`, `src/admin/AdminPortal.tsx`, `src/user/pwa/pwaRoutes.ts`  
**Project**: Y-TRACE (LYDO Connect Organization Focused)

---

## Executive Summary

This document provides a high-level inventory of all **SYSTEM MODULES** implemented in the Y-TRACE platform.

A **System Module** represents a major functional area of the application that groups multiple related pages, routes, features, and workflows. Individual pages (such as Sign In, Forgot Password, or Edit Profile) and granular features (such as File Upload or Button Actions) are excluded from this inventory and categorized within their parent module.

---

## System Modules Breakdown

### 1. Public Website & Information System
- **Module Name**: Public Website & Information System
- **Purpose**: Public-facing information hub providing platform overviews, FAQs, office contact channels, downloadable compliance templates, and legal policy pages.
- **Surface**: Public Website
- **Main Routes**: `/`, `/public-templates`, `/about`, `/advocacy`, `/faqs`, `/contacts`, `/site-map`, `/terms`, `/privacy`
- **Current Status**: Public

### 2. Authentication & Access Control
- **Module Name**: Authentication & Access Control
- **Purpose**: Identity and security framework handling user and administrator sign-in, organization onboarding sign-up requests, email verification, OAuth callbacks, and isolated password recovery sessions.
- **Surface**: Authentication
- **Main Routes**: `/signin`, `/admin/signin`, `/signup`, `/verify-email`, `/auth/callback`, `/reset-password`
- **Current Status**: Public

### 3. Organization Profile & YORP Registry Management
- **Module Name**: Organization Profile & YORP Registry Management
- **Purpose**: Core organization registry module handling organization profiling, officer/adviser directories, barangay mapping, URN issuance, and administrative YORP registry management.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/organization-profile`, `/admin/yorp-registry`
- **Current Status**: Protected

### 4. Document Submission & Compliance Validation
- **Module Name**: Document Submission & Compliance Validation
- **Purpose**: End-to-end compliance workflow module for organizations to upload required registration/renewal files and for administrators to review, validate, return, or approve compliance submissions.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/document-submission`, `/admin/registrations`
- **Current Status**: Protected

### 5. Budget Requests & Financial Utilization
- **Module Name**: Budget Requests & Financial Utilization
- **Purpose**: Financial assistance module for organizations to submit project budget proposals and for PCYDO administrators to evaluate, approve, allocate, and release funds.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/budget-request`, `/admin/budget-utilization`
- **Current Status**: Protected

### 6. Liquidation & Financial Audit Monitoring
- **Module Name**: Liquidation & Financial Audit Monitoring
- **Purpose**: Financial accountability module for organizations to report project expenditures and upload receipts, and for administrators to audit and close completed budgets.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/liquidation-reporting`, `/admin/liquidation-monitoring`
- **Current Status**: Protected

### 7. Public Transparency & Financial Disclosure Management
- **Module Name**: Public Transparency & Financial Disclosure Management
- **Purpose**: City transparency module for recording organization financial disclosures and managing public transparency posts and budget summaries.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/public-transparency`, `/admin/budget-monitoring`
- **Current Status**: Protected

### 8. YPOP Incentive & Activity Validation System
- **Module Name**: YPOP Incentive & Activity Validation System
- **Purpose**: Youth Participation & Organization Program incentive system for logging organization PPAs, tracking points, and validating activity scores during evaluation periods.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/ypop`, `/admin/ypop-validation`
- **Current Status**: Protected

### 9. Document Template & Resource Management
- **Module Name**: Document Template & Resource Management
- **Purpose**: Central repository for downloading official forms and templates in the user portal, and administrative tools for uploading, activating, and managing published files.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/templates`, `/admin/templates`
- **Current Status**: Protected

### 10. Inquiries & Support Helpdesk
- **Module Name**: Inquiries & Support Helpdesk
- **Purpose**: Ticket-based helpdesk module allowing youth organizations to submit inquiries and PCYDO administrators to manage and respond to support messages.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/app-inquiries`, `/admin/inquiries`
- **Current Status**: Protected

### 11. News Release Publishing System
- **Module Name**: News Release Publishing System
- **Purpose**: Official news publishing module for PCYDO administrators to draft, edit, and post official announcements, and for users/public to view detailed release records.
- **Surface**: Shared (Public Website & Admin Portal)
- **Main Routes**: `/news-releases`, `/news-releases/:newsReleaseId`, `/admin/news-releases`, `/admin/news-releases/:newsReleaseId`
- **Current Status**: Public / Protected

### 12. System Notifications & Communications
- **Module Name**: System Notifications & Communications
- **Purpose**: Real-time notification system delivering administrative review remarks, document decisions, budget alerts, and system broadcasts to users.
- **Surface**: Shared (User Portal & Admin Portal)
- **Main Routes**: `/notifications`, `/admin/notifications`
- **Current Status**: Protected

### 13. Compliance Status & Renewal Tracking
- **Module Name**: Compliance Status & Renewal Tracking
- **Purpose**: Organizational health and renewal tracking system calculating registration validity, document prerequisites, and renewal countdown clocks.
- **Surface**: User Portal
- **Main Routes**: `/compliance-status`
- **Current Status**: Protected

### 14. System Audit & Security Activity Logs
- **Module Name**: System Audit & Security Activity Logs
- **Purpose**: Administrative security trail capturing user logins, document uploads, status transitions, and administrative actions for system accountability.
- **Surface**: Admin Portal
- **Main Routes**: `/admin/activity-logs`
- **Current Status**: Protected

### 15. Progressive Web Application (PWA) Standalone Engine
- **Module Name**: Progressive Web Application (PWA) Standalone Engine
- **Purpose**: Touch-optimized, offline-capable mobile application framework providing standalone mobile navigation, PWA gateway resources (`/pwa-start/*`), settings, storage management, and app themes.
- **Surface**: PWA
- **Main Routes**: `/pwa-start/*`, `/app/*`
- **Current Status**: Public / Protected

---

## System Modules Categorization

### Public Website Modules
1. Public Website & Information System
2. News Release Publishing System

### Authentication Modules
1. Authentication & Access Control

### User Portal Modules
1. Compliance Status & Renewal Tracking

### Admin Portal Modules
1. System Audit & Security Activity Logs

### Shared Modules
1. Organization Profile & YORP Registry Management
2. Document Submission & Compliance Validation
3. Budget Requests & Financial Utilization
4. Liquidation & Financial Audit Monitoring
5. Public Transparency & Financial Disclosure Management
6. YPOP Incentive & Activity Validation System
7. Document Template & Resource Management
8. Inquiries & Support Helpdesk
9. System Notifications & Communications

### PWA Modules
1. Progressive Web Application (PWA) Standalone Engine

---

## Total Number of System Modules

```
=====================================================
            Y-TRACE SYSTEM MODULE COUNT
=====================================================
  Public Website Modules:       2
  Authentication Modules:       1
  User Portal Modules:          1
  Admin Portal Modules:         1
  Shared Modules:               9
  PWA Modules:                  1
-----------------------------------------------------
  TOTAL SYSTEM MODULES:        15
=====================================================
```
