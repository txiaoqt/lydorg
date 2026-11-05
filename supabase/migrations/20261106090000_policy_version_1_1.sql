-- Policy version 1.1: PCYDO naming, full list of service providers, data location
-- (Supabase, Australia), 30-day backup retention, corrected office address.
-- Publishing a new active version asks every signed-in user to accept again.
begin;

update public.policy_versions set is_active = false where is_active and version <> '1.1';

insert into public.policy_versions (version, title, terms_content, privacy_content, is_active, effective_date)
values (
  '1.1',
  'Y-TRACE Privacy Policy and Terms of Service',
  $policy$# Y‑TRACE Terms of Service

Version: 1.1  |  Last updated: November 6, 2026  |  Effective date: November 6, 2026

## Terms of Service at a Glance

Y‑TRACE is an official support platform for youth organization registration, compliance, YPOP participation, budget monitoring, liquidation, and related PCYDO services.

Use the system only for authorized, accurate, lawful, and official organization transactions.

Electronic status indicators support the process but do not replace required hard copies, wet signatures, official approvals, or the final authority of PCYDO and other competent offices.

Do not upload false, unauthorized, malicious, excessive, or unrelated content, and do not attempt to bypass security, eligibility, or workflow controls.

## 1. Agreement to These Terms

These Terms of Service govern your access to and use of Y‑TRACE, including its website, installed PWA, user portal, administrative portal, files, notifications, reports, and related services.

By creating an account, accepting the active policy version, or continuing to use authenticated features, you confirm that you have read and agree to these Terms and the Y‑TRACE Privacy Policy.

If you do not agree, do not use authenticated Y‑TRACE features. You may sign out and contact PCYDO for available alternative procedures, if any.

## 2. Operator and Intended Users

Y‑TRACE is operated by the City Government of Pasig, through the Pasig City Youth Development Office (PCYDO).

The service is intended for authorized representatives of youth organizations, authorized PCYDO and City Government personnel, administrators, evaluators, and other users approved for an official role.

If you are under 18, you may use Y‑TRACE only with the required parental or guardian consent, organizational authorization, and appropriate supervision.

## 3. Purpose and Scope of the Service

Y‑TRACE provides digital support for organization registration and profiling, compliance documents, YPOP and PPA participation, budget requests and monitoring, liquidation reporting, templates, news releases, inquiries, notifications, status tracking, reporting, and audit trails.

Y‑TRACE is a support and records-management system. It does not replace the lawful discretion, review, approval, financial control, audit authority, or official decision-making of PCYDO, the City Government, the National Youth Commission, or any other competent government office.

Unless expressly added through a formally approved update, Y‑TRACE does not provide payment processing, electronic-signature authorization, automatic fund disbursement, or direct integration with external government or national databases.

## 4. Accounts and Security

You must provide accurate account information and use only an account assigned to or authorized for you. You must not share passwords, authentication links, session tokens, or one-time codes.

You are responsible for activity performed through your account unless you promptly report unauthorized access. Sign out on shared devices and secure downloaded files and locally cached information.

PCYDO may require identity, role, or organization verification before granting or continuing access. Access may be limited by role, organization, status, eligibility, or workflow stage.

## 5. Authority to Submit Information

By submitting data or files, you represent that:

- You are authorized to act for the organization or perform the assigned administrative role.
- The information is accurate, complete, current, and not misleading.
- You have the lawful authority and any required consent to submit personal information about officers, advisers, members, participants, or other individuals.
- The files do not infringe intellectual-property, privacy, confidentiality, or other legal rights.
- The submission complies with applicable PCYDO, YORP, YPOP, budget, liquidation, records-management, and audit requirements.
You must update or correct information when it changes or when PCYDO requests a revision.

## 6. Acceptable Use

You may use Y‑TRACE only for legitimate organization and government-service purposes. You must not:

- Impersonate another person or organization, create unauthorized accounts, or misrepresent your role.
- Submit false, fabricated, altered, misleading, stolen, or unauthorized documents or evidence.
- Upload malware, harmful code, corrupted files, excessive data, or unrelated content.
- Attempt to access another organization's records or any administrative function without authorization.
- Bypass role controls, Row Level Security, eligibility rules, status gates, deadlines, file locks, review controls, or other safeguards.
- Manipulate points, scores, budget amounts, statuses, audit logs, timestamps, or review outcomes.
- Probe, scan, scrape, reverse engineer, overload, disrupt, or interfere with the system except under an expressly authorized security test.
- Use automated tools to collect personal data or bulk-download records without written authorization.
- Harass users or personnel, submit unlawful content, or use the service for fraud, discrimination, political campaigning unrelated to an official PCYDO process, or other unlawful activity.
## 7. Registration and Compliance Workflows

Submitting a form or file does not guarantee registration, verification, approval, eligibility, funding, or completion. PCYDO may review, return, reject, lock, archive, suspend, or request revisions to a submission according to official requirements.

Approved files may be locked against replacement or removal unless PCYDO formally reopens the requirement. Status labels and remarks should be read together with the applicable official notice.

Some processes may still require original documents, hard copies, wet signatures, in-person submission, or confirmation through another official channel. An electronic submission does not waive these requirements.

## 8. YPOP, PPA Participation, and Eligibility

YPOP points, scores, qualification indicators, and deadlines are calculated from recorded activities and approved evidence. Preliminary or automatically calculated values remain subject to validation by authorized personnel.

Joining an activity, uploading proof, logging an organization-initiated PPA, or reaching a displayed threshold does not by itself guarantee qualification, an incentive, a grant, or approval. Past or closed events may be unavailable for joining, and late or insufficient proof may be rejected.

## 9. Budget Requests and Funds

Budget-request access may depend on organization verification, compliance status, YPOP qualification, availability of an active program or funding cycle, and other official requirements.

A submitted or approved budget request is not a promise of payment or release. Requested, approved, and released amounts may differ. Fund release remains subject to lawful appropriation, documentation, financial controls, availability, and authorized government action.

Y‑TRACE does not itself transfer money. A status such as Approved, Go Signal, Budget Released, or Completed records a workflow stage and must be interpreted with official notices and supporting records.

## 10. Liquidation and Post-Activity Requirements

Liquidation access and deadlines may depend on an approved and released budget, activity completion, a go signal, and other official conditions.

You must submit truthful, complete, and readable liquidation records within the applicable period and retain original supporting documents when required. Failure to comply may affect the transaction, future eligibility, account status, or other official processes.

## 11. User Content and Files

You retain any rights you lawfully hold in the content you submit. By submitting content, you authorize the City Government, PCYDO, and their service providers to host, copy, review, validate, organize, convert for secure display, back up, archive, and otherwise process the content only as reasonably necessary for the official purposes described in the Privacy Policy and applicable law.

Do not upload information that is unnecessary for the requirement. You are responsible for keeping your own copies of important files and original documents.

## 12. Electronic Records, Notices, and Policy Acceptance

You agree that account actions, submissions, acknowledgments, reference numbers, status updates, remarks, notifications, and acceptance of policy versions may be created and maintained electronically.

The system may record the date and time of acceptance, user identifier, user agent, and other security metadata. Electronic records may be used to document the transaction, subject to applicable law and official records rules.

Notifications in Y‑TRACE or messages sent to your registered email or official contact channel are considered service communications. You are responsible for keeping contact information current and reviewing your account regularly.

## 13. PWA, Offline Access, and Local Storage

The installed PWA may cache application assets and previously loaded content. Limited offline access does not mean that submissions, approvals, reviews, or other transactions can be completed without a network connection.

A transaction is not complete until it is successfully received and recorded by the production system. You should confirm that the expected reference number, timestamp, or status appears after reconnecting.

## 14. Third-Party Services and External Links

Y‑TRACE relies on third-party services, including Supabase, Vercel, Google sign-in, Brevo email delivery, GitHub and Cloudflare for backups, and OpenStreetMap maps, and may contain links to Facebook or other external sites. Those services may have separate terms, privacy policies, availability, and technical limits.

The City Government and PCYDO are not responsible for external content or services they do not control, except to the extent responsibility cannot lawfully be excluded.

## 15. Service Availability and Changes

Y‑TRACE may be unavailable because of maintenance, provider outages, connectivity problems, security incidents, updates, legal requirements, or events beyond reasonable control.

Features, forms, statuses, eligibility rules, templates, and workflows may change to reflect updated laws, ordinances, program guidelines, security requirements, or official procedures. Important changes will be communicated through the system or another official channel when practicable.

## 16. Suspension, Restriction, and Account Closure

PCYDO may restrict, suspend, or terminate access when reasonably necessary to protect the system or public records; respond to suspected fraud, unauthorized access, or security incidents; enforce these Terms; comply with law or an official order; or address an inactive, duplicate, compromised, or unauthorized account.

Account closure does not automatically delete official records. Records may be retained according to the Privacy Policy, legal obligations, government retention schedules, audit requirements, and ongoing proceedings.

## 17. Intellectual Property

Y‑TRACE software, interface elements, branding, documentation, templates, and official content are owned by or licensed to their respective owners. The repository may include open-source components governed by their own licenses.

You may use official templates and materials only for their intended organization or government-service purpose. You must not remove notices, falsely claim ownership, or commercially exploit the service without written authorization.

## 18. Disclaimer

Y‑TRACE is provided as a government-service support platform. While reasonable efforts are made to maintain accurate, secure, and available information, the service may contain delays, errors, incomplete data, or temporary interruptions.

Displayed calculations, summaries, deadlines, statuses, and reports should be verified against the underlying record and official communication when a discrepancy exists.

Nothing in Y‑TRACE constitutes legal, accounting, audit, procurement, or financial advice, and nothing in these Terms limits duties or liabilities that cannot lawfully be limited.

## 19. Limitation of Liability

To the extent permitted by law, the City Government, PCYDO, their personnel, and authorized service providers are not liable for indirect, incidental, or consequential loss arising solely from user error, unauthorized account sharing, unsupported devices, external-service failures, loss of connectivity, or failure to keep independent copies of documents.

This clause does not exclude liability that cannot lawfully be excluded and does not remove any right or remedy available under applicable law.

## 20. Privacy

The collection and processing of personal data through Y‑TRACE is governed by the Y‑TRACE Privacy Policy, the Data Privacy Act of 2012, its Implementing Rules and Regulations, and other applicable rules.

## 21. Updates to These Terms

We may update these Terms to reflect changes in law, official procedures, system features, security practices, or service providers. The active version and effective date will be displayed in Y‑TRACE.

When a material update requires renewed agreement, you may be asked to review and accept the new version before continuing to authenticated features.

## 22. Governing Law and Dispute Resolution

These Terms are governed by the laws of the Republic of the Philippines and applicable ordinances and regulations of the City Government of Pasig.

Before filing a formal action, users are encouraged to submit the concern through Y‑TRACE inquiries or contact PCYDO so the office can review the relevant record. This does not prevent a person from exercising any right to complain to the National Privacy Commission, seek administrative review, or pursue another remedy allowed by law.

Any court action shall be brought before the court or venue with lawful jurisdiction, subject to applicable procedural and government rules.

## 23. Contact

Questions about these Terms or Y‑TRACE may be sent to lydo@pasigcity.gov.ph or delivered to 3/F Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City, Philippines.$policy$,
  $policy$# Y‑TRACE Privacy Policy

Version: 1.1  |  Last updated: November 6, 2026  |  Effective date: November 6, 2026

## Privacy Notice at a Glance

Y‑TRACE supports youth organization registration, compliance document submission, YPOP participation and scoring, budget requests, liquidation reporting, official templates, news releases, notifications, inquiries, and administrative review.

We collect only the information reasonably needed to operate these services, verify organizations and submissions, maintain official records, communicate decisions, secure the platform, and meet legal and audit requirements.

Y‑TRACE is operated by the City Government of Pasig through the Pasig City Youth Development Office. The system uses these service providers: Supabase for authentication, database and file storage (stored in Australia); Vercel for application hosting and content delivery; Google for optional sign-in with a Google account; Brevo for sending system emails; and GitHub and Cloudflare for running and storing backups.

We do not sell personal data or use it for commercial advertising.

Privacy questions may be sent to lydo@pasigcity.gov.ph. You may also request referral to the appropriate Data Protection Officer of the City Government of Pasig.

## 1. Scope and Purpose

This Privacy Policy explains how Y‑TRACE collects, uses, stores, shares, protects, and disposes of personal and organizational information when you use the website, installed Progressive Web Application (PWA), user portal, administrative portal, and related services.

Y‑TRACE is designed to support official PCYDO processes involving youth organization registration and profiling, required documents and compliance, YPOP and Programs, Projects, and Activities (PPA) participation, budget requests, budget monitoring, liquidation reports, templates, announcements, inquiries, notifications, and audit records.

This Policy applies to organization representatives, officers, advisers, members whose information is included in submitted records, PCYDO personnel, administrators, evaluators, and other individuals whose personal data is processed through Y‑TRACE.

## 2. Who Is Responsible for Your Data

The personal information controller for Y‑TRACE is the City Government of Pasig, through the Pasig City Youth Development Office (PCYDO).

Official contact: lydo@pasigcity.gov.ph

Office address: 3/F Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City, Philippines

For concerns that require formal privacy review, you may ask PCYDO to refer your request to the appropriate Data Protection Officer or privacy office of the City Government of Pasig.

## 3. Information We May Collect

We may collect the following categories of information, depending on the features you use and the requirements applicable to your organization:

- Account and identity information. Email address, full name, display name, contact number, account role, authentication identifiers, account status, password-reset information, and related account records. Passwords are handled by the authentication service and should not be stored by Y‑TRACE in readable form.
- Organization profile information. Organization name and email, contact number, district, barangay, address, organization type, registration or identifier number, major and sub-classification, advocacy areas, representative and adviser names, Facebook page or other official contact link, verification status, and related review information.
- Registration and compliance records. Constitutions and by-laws, registration forms, lists of officers, advisers or members, certifications, supporting requirements, file names, file types, file sizes, upload dates, review statuses, validation results, admin remarks, revision history, and other records required by the applicable YORP or PCYDO process.
- Participation and incentive records. YPOP periods, city-led activities, joined activities, organization-initiated PPAs, event details, proof documents, points, scores, qualification status, validation decisions, and reviewer remarks.
- Budget and liquidation information. Activity titles, descriptions, proposed dates, venues, purpose categories, requested, approved and released amounts, release dates, supporting files, user notes, administrative remarks, deadlines, completion information, and transaction statuses.
- Communications. Inquiries, subjects, descriptions, replies or administrative remarks, notifications, news-release interactions, and records of policy acceptance.
- Technical and security information. Browser and device information, user agent, IP address where collected, timestamps, session and authentication events, route or access events, system logs, audit trails, error records, and security-related metadata.
- PWA and local-device information. Essential application assets, preferences, authentication state, and limited cached content may be stored locally by your browser or installed PWA to improve performance and limited offline access.
## 4. Sources of Information

We obtain information directly from you or your authorized organization representative, from files and forms submitted through Y‑TRACE, from authorized PCYDO personnel who review or update records, and from automated system events such as status changes, audit logs, policy acceptance, and security logs.

Where necessary for an official process, PCYDO may compare submitted information with records lawfully held by the City Government or documents separately provided by your organization. Y‑TRACE does not currently provide automatic integration with external national government databases unless such integration is later formally approved, documented, and disclosed.

## 5. Why We Process Information

We process information for the following purposes:

- To create and secure user accounts and verify authorized access.
- To register, profile, verify, renew, and monitor youth organizations.
- To receive, review, approve, reject, return, lock, or request revisions to required documents.
- To record participation in YPOP and PPAs, calculate points or preliminary scores, validate proof, and determine program eligibility through the applicable official process.
- To receive and review budget requests, record approved and released amounts, monitor utilization, and process liquidation requirements.
- To provide templates, news releases, notifications, status updates, remarks, and responses to inquiries.
- To generate reports, dashboards, exports, and official administrative records.
- To maintain audit trails, prevent misuse, investigate errors or security incidents, and protect users, records, and public resources.
- To comply with applicable laws, ordinances, government recordkeeping duties, audit requirements, lawful orders, and official PCYDO procedures.
- To test, maintain, improve, and evaluate the reliability, usability, accessibility, performance, and security of Y‑TRACE.
## 6. Legal Bases for Processing

Depending on the data and purpose, Y‑TRACE processes personal information under one or more lawful criteria recognized by Republic Act No. 10173, its Implementing Rules and Regulations, and related issuances. These may include your informed consent where consent is appropriate; the fulfillment of a service or request you initiated; compliance with legal and regulatory obligations; the performance of official public functions and government services; the protection of lawful interests and system security; and other grounds permitted by law.

Consent is not the only basis for all processing. Some records must be processed or retained because PCYDO is required to perform an official function, maintain government records, complete an audit, respond to a lawful order, or protect the integrity of a public-service transaction.

## 7. Automated Scoring and Administrative Review

Y‑TRACE may automatically calculate points, percentages, deadlines, status indicators, or preliminary eligibility based on information recorded in the system. These calculations support the workflow but do not replace the judgment, verification, or final official decision of authorized PCYDO personnel.

You may question an incorrect calculation or status by submitting an inquiry or contacting PCYDO. The underlying record may be corrected when appropriate and legally permitted.

## 8. How We Share Information

We may disclose information only when reasonably necessary for an official purpose, including to:

- Authorized PCYDO and City Government personnel whose roles require access.
- Authorized users of the same organization, subject to account roles and access controls.
- Government offices, auditors, oversight bodies, law-enforcement authorities, courts, or other recipients when disclosure is required or authorized by law, official process, audit, or lawful order.
- Technology service providers that host, secure, transmit, back up, or support Y‑TRACE. These are: Supabase (authentication, database, application programming interfaces, and file storage); Vercel (application hosting and content delivery); Google (optional sign-in, which shares your name and email address with Y‑TRACE when you choose it); Brevo (delivery of system emails, which receives recipient email addresses and message content); GitHub (running backup jobs); and Cloudflare R2 (storing backup copies).
- Other parties when you direct or authorize the disclosure, or when necessary to protect life, public safety, system security, or legal rights, as allowed by law.
We do not sell personal data. We do not disclose personal data to advertisers for behavioral advertising.

## 9. Cloud Hosting and Data Location

Y‑TRACE uses cloud infrastructure, so your data is stored and processed outside the Philippines. The database, accounts, and uploaded files are stored with Supabase in Australia (Sydney region). The website is delivered through Vercel's global network, which may serve pages from the location nearest to you. Backup copies are stored in Cloudflare R2, and backup jobs run on GitHub. Emails are sent through Brevo.

The City Government applies contractual, organizational, and technical safeguards to this cross-border processing, as required by the Data Privacy Act of 2012.

## 10. Retention and Disposal

We retain information only for as long as necessary for the purpose for which it was collected and for applicable government recordkeeping, registration, compliance, financial, audit, legal, security, and administrative requirements.

Retention periods may differ by record type. Registration and organization records may be retained throughout the organization's active registration, renewal, compliance, and archival period. Budget, liquidation, audit, and transaction records may be retained for the period required by applicable accounting, audit, public-record, and legal rules. Security logs, local caches, and temporary files may have shorter operational retention periods.

Backups are kept for up to 30 days and are then deleted, so deleted or updated data may remain in a backup until that backup is deleted. When information is no longer required, it should be securely deleted, anonymized, archived, or otherwise disposed of under the City's approved records-management and data-disposal procedures.

A request to erase data may be limited when the record must be preserved for an official government function, legal obligation, audit, investigation, dispute, or other lawful purpose.

## 11. Security Measures

Y‑TRACE is designed to use authentication, role-based access control, Row Level Security, protected routes, secure session handling, database constraints, audit logs, environment-protected credentials, HTTPS/TLS transmission, and provider-level safeguards. Access should be limited to users and personnel whose roles require it.

No system can guarantee absolute security. Users must protect their passwords, devices, downloaded files, and active sessions, and must promptly report suspected unauthorized access, loss of a device, or incorrect account activity.

## 12. Cookies, Local Storage, and PWA Caching

Y‑TRACE may use essential cookies, browser storage, and similar technologies for authentication, security, policy acceptance, preferences, session continuity, performance, and PWA functionality. The installed PWA may cache application assets and previously loaded information on the device.

Cached content may remain on the device until it expires, is cleared through browser or app settings, or the PWA is uninstalled. Users of shared devices should sign out and clear local data when appropriate.

Y‑TRACE does not use essential storage for commercial advertising. If optional analytics or new tracking technologies are introduced, this Policy and the user interface should be updated before they are enabled.

## 13. Third-Party Links and Services

Y‑TRACE may link to official Facebook posts, public documents, or other external websites. The Contacts page shows a map from OpenStreetMap, which receives your IP address when the map images load. These third-party services operate under their own terms and privacy policies. Y‑TRACE is not responsible for the privacy practices or availability of an external service that it does not control.

## 14. Information About Minors and Other Individuals

Because youth organizations may include minors, users must exercise special care when submitting information about members, officers, participants, or beneficiaries who are under 18 years old.

The organization representative must have lawful authority to submit another person's information and must obtain parental, guardian, or other legally required consent when applicable. Only information necessary for the official requirement should be uploaded. Unnecessary sensitive information should not be included in files or free-text fields.

If a minor directly uses an account, the organization and PCYDO must ensure that appropriate authorization, supervision, and consent requirements are satisfied.

## 15. Your Data Privacy Rights

Subject to the conditions, limitations, and exceptions under applicable law, data subjects may exercise the right to be informed, access personal data, object to processing, correct inaccurate data, request erasure or blocking, obtain data portability where applicable, claim damages, and file a complaint with the National Privacy Commission.

To make a request, contact PCYDO and provide enough information to verify your identity and locate the relevant record. We may ask for proof of identity or authority before acting on a request. Requests involving official organization, financial, audit, or government records may be limited by applicable law and retention duties.

## 16. Data Breach and Incident Response

Y‑TRACE administrators and service providers should investigate suspected security incidents and take appropriate containment, recovery, documentation, and notification measures. Where the law requires notification to affected individuals or the National Privacy Commission, the responsible office will provide the required notice within the legally applicable period.

## 17. Accuracy and User Responsibility

You are responsible for keeping your account and organization information accurate, complete, current, and authorized. You must promptly correct inaccurate data or respond to a revision request. PCYDO may verify submitted information and may mark records as incomplete, needing revision, rejected, suspended, or otherwise restricted when requirements are not met.

## 18. Changes to This Policy

We may update this Policy to reflect changes in law, official procedures, system functions, service providers, or security practices. The active version, effective date, and content will be displayed in Y‑TRACE. When a material update requires renewed agreement, authenticated users may be asked to review and accept the new version before continuing.

## 19. Contact and Complaints

Privacy and service concerns may be submitted to lydo@pasigcity.gov.ph or delivered to 3/F Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City, Philippines.

Please include your name, organization, contact details, the record or transaction involved, and a clear description of your concern. Do not send passwords or unnecessary sensitive information by email.

You may also file a complaint with the National Privacy Commission when appropriate. Contact details and complaint procedures are available through the Commission's official channels.$policy$,
  true,
  date '2026-11-06'
)
on conflict (version) do update
  set terms_content = excluded.terms_content,
      privacy_content = excluded.privacy_content,
      effective_date = excluded.effective_date,
      is_active = true;

commit;
