// OPS SOW Blueprint Library
// Reusable templates for automatic SOW generation inside OPS Studio Command Center.
// Each blueprint maps directly to the SOW editor fields.

const SOW_BLUEPRINTS = {

  'signature-plan': {
    label: 'Signature Plan',
    group: 'Strategic Partnership Plans',
    title: 'Signature Plan — Scope of Work',

    deliverables: `Strategic Discovery session (90 minutes)
Custom-designed website — up to 5 pages (Home, About, Services, Contact + 1 optional)
Mobile-optimised, cross-browser tested build
One integrated interaction point — Online Booking Experience OR Lead Capture Experience (client's choice)
Domain connection and deployment
Basic analytics setup (Google Analytics or equivalent)
Monthly Digital Presence Management — 2 structured update cycles per month
Monthly performance summary report
OPS Client Onboarding Package (welcome documentation, process guides, communication protocols)`,

    milestones: `Milestone 1 — Discovery & Strategy (Week 1–2)
Requirements gathering, brand audit, platform confirmation, scope sign-off.

Milestone 2 — Design Concepts (Week 3–4)
Wireframes and visual direction presented. Client review and approval required before build.

Milestone 3 — Build & Development (Week 5–8)
Approved designs built and configured. Interaction system integrated.

Milestone 4 — Review & Revisions (Week 9–10)
Client review window open. Feedback consolidated and incorporated. Final sign-off required.

Milestone 5 — Launch & Handover (Week 11–12)
Deployment, post-launch verification, analytics confirmation, onboarding documentation delivered.`,

    timeline: `Estimated delivery: 10–12 weeks from signed agreement and receipt of all client assets.

Timeline is contingent on:
- Client content and assets received before the Build phase
- Client approvals returned within 5 business days at each milestone
- Domain access provided at least 5 business days before launch
- No material scope changes after Discovery sign-off

Delays caused by late content, slow approvals, or access issues will extend the timeline proportionally.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Provide all page copy, content, and written text in finalised form before the Build phase.
Supply brand assets: logo files (SVG/PNG), brand colours, and approved typography.
Provide domain access credentials or facilitate domain pointing.
Designate a single point of contact for approvals and communications.
Respond to OPS review requests within 5 business days.
Provide written approval at each milestone before work advances.
Notify OPS immediately of any access or credential issues.

OPS RESPONSIBILITIES
Lead all design, development, and project management.
Deliver to the agreed scope, timeline, and quality standard.
Conduct quality assurance testing across devices and browsers before launch.
Manage deployment and post-launch verification.
Execute monthly presence management within the defined update framework.
Provide monthly performance reporting.
Maintain professional communication with structured response times.`,

    assumptions: `The client has an established brand identity with a finalised logo and brand guidelines.
All copy and content will be provided by the client in finalised form before the Build phase begins.
The agreed scope will not change materially during the project.
The client has authority to approve all design, content, and launch decisions.
The selected booking or third-party platform is accessible and operational.
No significant platform, technical, or legal constraints exist that have not been disclosed at Discovery.

REVISION LIMITS
Design: 2 structured revision rounds.
Content layout: 1 revision round.
Post-launch amendments are covered by the monthly management cycles, not the initial build budget.

THIRD-PARTY DEPENDENCIES
Domain registrar (client-managed or transferred to OPS on instruction).
Hosting provider (OPS-managed or client-provided).
Booking platform (if applicable): Calendly, Square, Acuity, or agreed equivalent.
Analytics: Google Analytics / Google Search Console.

SUCCESS CRITERIA
Website live across all agreed pages, functional on desktop and mobile.
Integrated interaction point (booking or lead capture) tested and operational.
Analytics tracking confirmed active.
Client Onboarding Package delivered.
Monthly management cycle initiated.`,

    exclusions: `Copywriting, content writing, or editorial services.
Photography, videography, or creative production.
Pages beyond the agreed 5-page scope.
E-commerce, payment processing, or shopping cart functionality.
Custom software integrations beyond the single included interaction point.
Advanced SEO campaigns or paid advertising management.
Logo design, brand identity creation, or graphic design assets.
Legal documentation (terms, privacy policies, compliance documents).
Platform migration or data transfer services.
Emergency or out-of-hours support.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional pages or sections.
E-commerce or online store setup.
Custom API integrations or software connections.
Copywriting or content creation.
Additional booking systems or lead capture forms.
Brand identity or logo design.
Advanced automation or CRM setup.
Photography or media production.
Additional revision rounds.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation. Oak & Pixel Studio reserves the right to decline scope additions that would compromise delivery timelines or quality standards.`
  },

  'growth-plan': {
    label: 'Growth Plan',
    group: 'Strategic Partnership Plans',
    title: 'Growth Plan — Scope of Work',

    deliverables: `Strategic Discovery & Growth Mapping session (2 hours)
Custom-designed website — up to 8 pages
Mobile-optimised, cross-browser tested build
Online Booking Experience — full configuration (up to 3 service types)
Lead Capture Experience — landing page + automated response flow
Client Onboarding Experience — structured digital onboarding for client's customers (up to 3 steps)
Domain connection and deployment
Analytics and conversion tracking setup
Monthly Digital Presence Management — 4 structured update/content cycles per month
Monthly performance and growth metrics report
Quarterly strategy review session (30 minutes)
OPS Client Onboarding Package`,

    milestones: `Milestone 1 — Discovery & Growth Mapping (Week 1–2)
Requirements gathering, growth audit, infrastructure planning, platform decisions, scope sign-off.

Milestone 2 — Design Concepts (Week 3–4)
Wireframes and visual direction for site and all interaction systems. Client review required before build.

Milestone 3 — Build & Configuration (Week 5–9)
Approved designs built. Booking, lead capture, and onboarding systems configured and integrated.

Milestone 4 — Review & Revisions (Week 10–11)
Full client review window. Consolidated feedback incorporated across all systems. Final approvals.

Milestone 5 — Launch & Handover (Week 12–13)
Deployment, analytics verification, onboarding package delivered, management cycle initiated.`,

    timeline: `Estimated delivery: 12–14 weeks from signed agreement and receipt of all client assets.

Timeline is contingent on:
- Client content and assets received before the Build phase
- Access to all third-party platforms at least 2 weeks before integration phase
- Client approvals returned within 5 business days at each milestone
- Domain access provided 5 business days before launch
- No material scope changes after Discovery sign-off

Delays caused by late content, slow approvals, or inaccessible platforms will extend the timeline proportionally.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Provide all page copy, content, and written text in finalised form before the Build phase.
Supply brand assets: logo files, brand colours, and typography guidelines.
Provide domain access credentials.
Provide access to all platforms being integrated.
Designate a single point of contact for all approvals and communications.
Respond to OPS review requests within 5 business days.
Provide written milestone approvals before work advances.
Participate in the scheduled quarterly strategy sessions.

OPS RESPONSIBILITIES
Lead all design, development, and project management.
Configure and test all three interaction systems (booking, lead capture, onboarding) within the agreed scope.
Deliver quality-assured build across all devices and browsers.
Manage deployment and post-launch verification.
Execute monthly presence management within the defined update framework.
Deliver monthly performance and growth metrics reports.
Facilitate quarterly strategy review sessions.
Maintain professional communication with a structured delivery cadence.`,

    assumptions: `The client has an established brand identity and finalised assets.
All client content will be delivered in finalised form before the Build phase.
Selected third-party platforms are active, accessible, and operational before integration begins.
The agreed scope will not materially change during the project.
The client has authority to approve all design, configuration, and launch decisions.
No undisclosed technical, legal, or platform constraints exist.

REVISION LIMITS
Website design: 2 structured revision rounds.
Each interaction system configuration: 1 revision round.
Content layout: 1 revision round.
Post-launch: Covered by monthly management cycles.

THIRD-PARTY DEPENDENCIES
Domain registrar and hosting provider.
Booking platform: Calendly, Acuity, Square, or agreed equivalent (client account).
Email marketing or CRM platform (if connected to lead capture — client account).
Analytics: Google Analytics and Google Search Console.
Payment provider (if applicable).

SUCCESS CRITERIA
Website live across all 8 pages, functional on desktop and mobile.
Booking system operational and tested end-to-end.
Lead capture flow live and tested.
Client onboarding experience configured and accessible.
Analytics and conversion tracking active and verified.
Monthly management cycle confirmed and operating.
Quarterly review schedule confirmed.`,

    exclusions: `Copywriting, content writing, or editorial services.
Photography, videography, or creative production.
Pages beyond the agreed 8-page scope.
E-commerce or shopping cart functionality.
Custom software integrations beyond the three included interaction systems.
Advanced SEO campaigns or paid advertising management.
Logo design or brand identity creation beyond plan scope.
Legal documentation.
Platform migration or data transfer services.
Emergency or out-of-hours support beyond the defined support framework.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional pages beyond 8-page scope.
Additional booking systems or calendar integrations.
Custom CRM or automation builds.
E-commerce functionality.
Copywriting or content creation.
Photography or media production.
Brand identity or logo design.
Additional revision rounds.
Custom API integrations or software builds.
Additional interaction systems beyond those specified.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  },

  'premium-plan': {
    label: 'Premium Plan',
    group: 'Strategic Partnership Plans',
    title: 'Premium Plan — Scope of Work',

    deliverables: `Premium Strategic Discovery & Infrastructure Mapping — half-day session
Custom-designed advanced website — up to 12 pages
Mobile-optimised, performance-tested, speed-optimised build
Online Booking Experience — full premium configuration (up to 5 service types)
Lead Capture Experience — multi-touchpoint setup with automated response flows
Client Onboarding Experience — full digital onboarding journey (up to 5 stages)
Client Operating System — internal operations hub (up to 4 modules)
Domain connection and deployment
Advanced analytics, conversion tracking, and goal configuration
Monthly Digital Presence Management — 8 structured update, content, and optimisation cycles per month
Monthly performance, growth, and operations report
Monthly strategy session (45 minutes)
Quarterly Infrastructure Audit & Optimisation Review
Priority support within defined response framework
OPS Client Onboarding Package`,

    milestones: `Milestone 1 — Discovery & Infrastructure Mapping (Week 1–3)
Deep requirements gathering, full infrastructure planning, technical architecture, scope sign-off.

Milestone 2 — Design Direction (Week 4–5)
Full site wireframes, all system interaction designs, visual direction presented. Client sign-off required.

Milestone 3 — Build Phase 1 (Week 6–9)
Core website and primary interaction systems (booking, lead capture) built and configured.

Milestone 4 — Build Phase 2 (Week 10–12)
Client Onboarding Experience and Client Operating System built and configured.

Milestone 5 — Review & Revisions (Week 13–14)
Complete infrastructure review across all systems. Consolidated feedback incorporated. Final approvals.

Milestone 6 — Launch & Activation (Week 15–16)
Deployment, full analytics verification, infrastructure audit, management cycle initiated, strategy sessions scheduled.`,

    timeline: `Estimated delivery: 14–18 weeks from signed agreement and receipt of all client assets.

Timeline is contingent on:
- All client assets and content received before Build Phase 1 begins
- Access to all third-party platforms required at least 3 weeks before integration phase
- Client approvals returned within 3 business days at each milestone
- Domain and hosting access provided 10 business days before launch
- No material scope changes without a formal Change Request

Delays caused by late content, slow approvals, or inaccessible platforms extend the timeline proportionally. The structured dual-phase build is designed to allow parallel delivery where appropriate.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Provide all page copy, content, and written text in finalised form before Build Phase 1 begins.
Supply complete brand assets: logo files, brand guidelines, photography, approved copy.
Provide domain access and hosting credentials.
Provide access credentials for all platforms being integrated or managed.
Designate a senior point of contact and a backup contact.
Respond to OPS review requests within 3 business days.
Provide written milestone approvals before each phase advances.
Participate in monthly strategy sessions and quarterly reviews.
Ensure no third-party modifications to the digital infrastructure without notifying OPS.

OPS RESPONSIBILITIES
Lead all design, development, strategy, and project management across both build phases.
Configure and test all five OPS interaction and operational systems.
Deliver performance-optimised, quality-assured build across all devices and browsers.
Manage deployment, post-launch verification, and ongoing infrastructure.
Execute monthly presence management, optimisation, and reporting.
Facilitate monthly strategy sessions and quarterly infrastructure audits.
Maintain priority communication standards within the agreed response framework.
Proactively surface optimisation opportunities and infrastructure improvements.`,

    assumptions: `The client has a complete, finalised brand identity with all assets ready before build begins.
All content will be provided in finalised form before the relevant build phase begins.
All agreed third-party platforms are active and accessible.
The agreed scope will not change without a formal Change Request.
The client has full organisational authority over all digital infrastructure decisions.
No undisclosed technical, legal, or platform constraints exist that would affect delivery.

REVISION LIMITS
Website design: 3 structured revision rounds.
Each interaction system: 2 revision rounds.
Client Operating System: 2 revision rounds.
Content layout: 2 revision rounds.
Post-launch: Covered by monthly management and optimisation cycles.

THIRD-PARTY DEPENDENCIES
Domain registrar and hosting provider.
Booking platform — premium configuration (client account).
Email marketing or CRM platform (client account).
Payment gateway (if applicable — client account).
Analytics: Google Analytics, Google Search Console, and/or agreed equivalents.
Calendar and scheduling infrastructure.
Any additional platforms identified and agreed during Discovery.

SUCCESS CRITERIA
All 12 website pages live, functional, and optimised on desktop and mobile.
All five OPS systems configured, tested, and operationally confirmed.
Advanced analytics and goal tracking active and verified.
Monthly management cycle confirmed and operating.
Monthly strategy sessions scheduled and first session completed.
Quarterly review framework established.
Client equipped to manage day-to-day operations independently within the agreed framework.`,

    exclusions: `Copywriting, content writing, or editorial services (unless explicitly added by addendum).
Photography, videography, or creative production.
Pages beyond the agreed 12-page scope.
E-commerce or shopping cart functionality (unless specified at Discovery).
Custom software builds or bespoke application development.
Advanced SEO campaign management or paid advertising.
Logo design, brand identity creation beyond plan scope.
Legal documentation.
Emergency or out-of-hours support beyond the defined SLA.
Platform migration or large-scale data transfer.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional pages beyond 12-page scope.
Custom software or bespoke application development.
E-commerce functionality not specified at Discovery.
Copywriting or content creation.
Photography, video, or media production.
Advanced paid advertising or SEO campaign management.
Additional automation or CRM configuration beyond plan scope.
Additional revision rounds.
Emergency support outside the defined SLA.
Platform migrations or large-scale data transfers.
New integrations or systems not specified at Discovery.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation. Oak & Pixel Studio reserves the right to decline scope additions that would compromise delivery timelines or quality standards.`
  },

  'premium-website': {
    label: 'Premium Website',
    group: 'Standalone Services',
    title: 'Premium Website — Scope of Work',

    deliverables: `Discovery session (60 minutes)
Custom-designed website — up to 6 pages
Mobile-optimised, cross-browser tested build
Performance optimisation
Domain connection and deployment
Basic analytics setup (Google Analytics or equivalent)
One post-launch check-in within 14 days of launch
OPS project documentation`,

    milestones: `Milestone 1 — Discovery (Week 1)
Requirements gathering, content review, site architecture confirmation, scope sign-off.

Milestone 2 — Design Concepts (Week 2–3)
Visual concepts and page layouts presented for client review. Approval required before build.

Milestone 3 — Build & Development (Week 4–6)
Approved designs developed, configured, and prepared for launch.

Milestone 4 — Review & Revisions (Week 7–8)
Client review window open. Feedback incorporated. Final sign-off required.

Milestone 5 — Launch (Week 9)
Deployment, post-launch verification, analytics confirmation, check-in scheduled.`,

    timeline: `Estimated delivery: 8–10 weeks from signed agreement and receipt of all client assets.

Timeline is contingent on:
- Client content and assets received before the Build phase
- Client approvals returned within 5 business days at each milestone
- Domain access provided at least 5 business days before launch
- No material scope changes after Discovery sign-off

Delays caused by late content, slow approvals, or domain access issues will extend the timeline proportionally.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Provide all page copy, content, and written text in finalised form before the Build phase.
Supply brand assets: logo files (SVG/PNG), brand colours, and approved typography.
Provide domain access credentials or facilitate domain pointing.
Designate a single point of contact for all approvals and communications.
Respond to OPS review requests within 5 business days.
Provide written sign-off at each milestone before work advances.

OPS RESPONSIBILITIES
Design, develop, and deliver the website to the agreed specifications and quality standard.
Conduct quality assurance testing across devices and browsers before launch.
Deploy to the live environment and verify launch performance.
Set up basic analytics tracking and confirm it is active.
Deliver one post-launch check-in within 14 days to verify continued stability.`,

    assumptions: `The client has a finalised brand identity with a confirmed logo and brand guidelines.
All copy and content will be provided by the client in finalised form before the Build phase.
The agreed scope will not change materially during the project.
No advanced integrations, booking systems, or e-commerce functionality are required.
The client has authority to approve all design, content, and launch decisions.

REVISION LIMITS
Design: 2 structured revision rounds.
Content layout: 1 revision round.
Post-launch amendments are quoted separately.

THIRD-PARTY DEPENDENCIES
Domain registrar (client-managed or transferred to OPS on instruction).
Hosting provider (OPS-managed or client-provided).
Analytics: Google Analytics / Google Search Console.

SUCCESS CRITERIA
Website live across all agreed pages, functional on desktop and mobile.
Performance loading correctly and analytics tracking confirmed active.
Client has independent access and can manage basic content updates.
Post-launch check-in completed within 14 days of launch.`,

    exclusions: `Copywriting or content creation.
Photography or videography.
Pages beyond the agreed 6-page scope.
E-commerce or online store functionality.
Booking systems or lead capture forms (available as standalone services).
Custom integrations or API connections.
Ongoing management or maintenance.
Legal documentation.
SEO campaign management or paid advertising.
Brand identity or logo design.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional pages beyond the 6-page scope.
E-commerce or booking functionality.
Copywriting or content creation.
Photography or media production.
Ongoing management or maintenance.
Custom integrations or software connections.
Additional revision rounds.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  },

  'online-booking': {
    label: 'Online Booking Experience',
    group: 'Standalone Services',
    title: 'Online Booking Experience — Scope of Work',

    deliverables: `Discovery session (45 minutes) to map service types, availability logic, and client journey
Booking system design and configuration — up to 3 service types or booking flows
Calendar integration with the client's preferred scheduling platform
Automated confirmation and reminder communications (email and/or SMS configuration)
Mobile-optimised booking interface
End-to-end testing across devices and booking scenarios
Integration with the client's website (standard embed, if applicable)
OPS handover documentation with client management guide`,

    milestones: `Milestone 1 — Discovery (Days 1–3)
Service mapping, availability logic confirmed, platform decision, scope sign-off.

Milestone 2 — Configuration (Days 4–8)
Booking system setup: service types, availability rules, buffer times, calendar sync.

Milestone 3 — Communications Setup (Days 9–11)
Confirmation and reminder email/SMS flows configured.

Milestone 4 — Testing & Review (Days 12–14)
End-to-end testing across all booking flows. Client review. Adjustments incorporated.

Milestone 5 — Launch & Handover (Day 15)
Booking system live. Handover documentation delivered. Client briefed on independent management.`,

    timeline: `Estimated delivery: 2–3 weeks from signed agreement and receipt of required access and information.

Timeline is contingent on:
- Service list, pricing, and availability parameters provided before configuration begins
- Access to the booking platform account provided on Day 1
- Calendar credentials provided before the integration phase
- Client review and sign-off returned within 3 business days

Delays caused by missing access, unclear service structures, or slow approvals will extend the timeline.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Provide a finalised service list, descriptions, pricing, and availability parameters.
Provide access to the agreed booking platform account (or consent to OPS's recommended platform).
Provide calendar access credentials.
Confirm the copy for confirmation and reminder communications.
Respond to OPS review requests within 3 business days.
Conduct a test booking end-to-end and provide written sign-off.

OPS RESPONSIBILITIES
Configure the booking system to the agreed specifications.
Set up all defined service types, availability logic, and buffer rules.
Integrate calendar sync and confirm it is operational.
Configure confirmation and reminder communications.
Conduct end-to-end testing of all booking flows before handover.
Deliver handover documentation enabling the client to manage the system independently.`,

    assumptions: `The client has a confirmed booking platform preference or is willing to adopt OPS's recommendation.
Service types, pricing, and availability are finalised before configuration begins.
The client has or will establish their own platform account if required.
No custom-coded development is required — standard platform configuration only.
SMS messaging costs are managed through the client's platform account.

REVISION LIMITS
Configuration: 1 revision round per service type.
Communications copy: 1 revision round.
Post-launch changes are quoted separately.

THIRD-PARTY DEPENDENCIES
Booking platform: Calendly, Acuity, Square Appointments, or agreed equivalent (client-managed account).
Calendar: Google Calendar, Microsoft Outlook, or equivalent.
Email platform: integrated or standalone.
SMS gateway: client-managed account (if applicable).

SUCCESS CRITERIA
All agreed booking flows live and tested end-to-end.
Calendar sync operational and confirmed.
Confirmation and reminder communications sending correctly.
Client able to independently manage bookings, availability, and service types.`,

    exclusions: `Website design or build (separate service).
More than 3 distinct service types or booking flows.
Payment processing setup (quoted separately).
Custom-coded booking solutions — standard platform configuration only.
CRM or advanced database integrations.
Ongoing management or platform administration beyond initial setup.
Copywriting for confirmation or reminder communications.
Photography or media for booking pages.
SMS messaging platform costs (client responsibility).

OUT-OF-SCOPE WORK (requires separate quotation)
Additional service types or booking flows beyond 3.
Payment processing setup.
CRM or advanced platform integrations.
Ongoing management and platform administration.
Custom-coded booking development.
Website integration beyond a standard embed.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  },

  'lead-capture': {
    label: 'Lead Capture Experience',
    group: 'Standalone Services',
    title: 'Lead Capture Experience — Scope of Work',

    deliverables: `Discovery session (45 minutes) to define target audience, offer, and conversion goal
One dedicated landing page — designed and built
Lead capture form — up to 8 fields
Automated email response to enquirer (welcome or follow-up communication)
Lead notification to client (email alert or dashboard integration)
Mobile-optimised, performance-ready build
Integration with client's email platform or CRM — standard connection
OPS handover documentation`,

    milestones: `Milestone 1 — Discovery (Days 1–2)
Audience definition, offer confirmation, form field mapping, integration platform confirmed, scope sign-off.

Milestone 2 — Design (Days 3–5)
Landing page visual design presented for client review. Approval required before build.

Milestone 3 — Build & Configuration (Days 6–10)
Page built. Form configured. Automated response and lead notification set up. Integration connected.

Milestone 4 — Review & Testing (Days 11–13)
End-to-end testing of the full capture and response flow. Client review. Adjustments incorporated.

Milestone 5 — Launch (Days 14–15)
Page live. Confirmation flows verified. Handover documentation delivered.`,

    timeline: `Estimated delivery: 2–3 weeks from signed agreement and receipt of all client assets.

Timeline is contingent on:
- All copy and content provided before the Design phase
- Access to the email platform or CRM provided before the Build phase
- Client review and sign-off returned within 3 business days

Delays caused by missing assets, unclear offer structures, or slow approvals will extend the timeline.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Provide all landing page copy — headline, body text, and CTA language — in finalised form.
Supply brand assets: logo, colours, and fonts.
Confirm the lead capture offer and all form fields.
Provide access to the email platform or CRM for integration.
Respond to OPS review requests within 3 business days.
Test the form and confirmation flow end-to-end, and provide written sign-off.

OPS RESPONSIBILITIES
Design and build the landing page to the agreed specifications.
Configure the lead capture form.
Set up the automated response communication to enquirers.
Configure lead notification delivery to the client.
Conduct end-to-end testing of the full capture and response flow.
Integrate with the client's email platform or CRM.
Deliver handover documentation.`,

    assumptions: `Copy, offer, and form fields are finalised by the client before delivery begins.
The client has an active email platform or CRM account for lead routing.
No advanced automation or multi-step nurture sequences are required within this scope.
One landing page only is within scope.
No custom-coded form or data solutions are required.

REVISION LIMITS
Design: 1 revision round.
Form and flow configuration: 1 revision round.
Post-launch changes are quoted separately.

THIRD-PARTY DEPENDENCIES
Email platform or CRM: Mailchimp, HubSpot, ActiveCampaign, or agreed equivalent (client account).
Form platform (if standalone): Typeform, Tally, or integrated solution.
Hosting (for standalone landing page, if applicable).

SUCCESS CRITERIA
Landing page live, mobile-optimised, and loading with acceptable performance.
Lead capture form submitting correctly and routing leads to the client.
Automated response sending to enquirers.
Client receiving lead notifications.
Integration with email platform or CRM confirmed operational.`,

    exclusions: `Copywriting or content creation for the landing page or any communications.
Photography or visual media production.
Multiple landing pages — this SOW covers one page only.
A/B testing or conversion rate optimisation campaigns.
Paid advertising management or campaign setup.
Advanced CRM automation or multi-step nurture sequences.
Ongoing management or maintenance.
Custom-coded form or data solutions.
Lead scoring or advanced segmentation.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional landing pages.
Copywriting or content creation.
Photography or media production.
A/B testing or conversion optimisation.
Paid advertising or campaign management.
Advanced CRM automation or nurture sequences.
Ongoing management or maintenance.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  },

  'client-onboarding': {
    label: 'Client Onboarding Experience',
    group: 'Standalone Services',
    title: 'Client Onboarding Experience — Scope of Work',

    deliverables: `Discovery & Journey Mapping session (60 minutes)
Onboarding flow design — up to 5 structured steps or stages
Branded welcome communication (email or landing page)
Intake or information collection form — up to 12 fields
Automated document or information delivery to new clients (confirmation, resources, or next steps)
Client-side notification on each new onboarding submission
Mobile-optimised design and build
Integration with client's existing platform — CRM, email, booking, or project tool (standard connection)
OPS handover documentation with step-by-step client management guide`,

    milestones: `Milestone 1 — Discovery & Journey Mapping (Week 1)
Onboarding flow mapped, client journey defined, integration platforms confirmed, scope sign-off.

Milestone 2 — Design (Week 2)
Journey design and branded communications presented for review. Approval required before build.

Milestone 3 — Build & Configuration (Week 3–4)
All onboarding stages built. Forms configured. Communications set up. Integrations connected.

Milestone 4 — Review & Testing (Week 4–5)
End-to-end testing of the complete onboarding flow. Client review. Adjustments incorporated.

Milestone 5 — Launch & Handover (Week 5)
System live. Handover documentation and management guide delivered.`,

    timeline: `Estimated delivery: 4–5 weeks from signed agreement and receipt of all required assets.

Timeline is contingent on:
- Onboarding journey confirmed and copy provided before the Build phase
- Platform integration access provided before the Build phase
- Client review and sign-off returned within 3 business days at each milestone

Delays caused by missing assets, unclear journey structures, or inaccessible platforms will extend the timeline.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Map and confirm the desired onboarding journey before the Build phase.
Provide all copy for communications, forms, and onboarding materials in finalised form.
Supply brand assets: logo, colours, and fonts.
Provide access to the platform(s) being integrated.
Designate the person responsible for managing incoming onboarding submissions.
Respond to OPS review requests within 3 business days.
Test the full onboarding flow end-to-end and provide written sign-off.

OPS RESPONSIBILITIES
Design the onboarding journey to the agreed specifications.
Build and configure all onboarding stages, forms, and communications.
Set up client notifications and submission routing.
Integrate with the agreed platform(s).
Conduct end-to-end testing of the complete onboarding flow.
Deliver handover documentation and management guide enabling independent operation.`,

    assumptions: `The onboarding journey structure is confirmed and finalised before build begins.
All communications copy is provided by the client in finalised form.
The client has active accounts on required platforms.
No advanced multi-branch automation or conditional logic flows are required within this scope.
Up to 5 onboarding stages only are within scope.

REVISION LIMITS
Design: 2 revision rounds.
Form and flow configuration: 1 revision round.
Communications: 1 revision round.
Post-launch changes are quoted separately.

THIRD-PARTY DEPENDENCIES
CRM or project management platform: HubSpot, Notion, ClickUp, or agreed equivalent (client account).
Email platform for communications.
Form platform (if standalone).
Electronic signature platform (if required and explicitly included — quoted separately).

SUCCESS CRITERIA
All onboarding stages live and operational.
New client submissions routing correctly to the designated contact.
Welcome and follow-up communications confirmed sending.
Client equipped with a management guide to independently process new submissions.
Full flow tested, verified, and signed off.`,

    exclusions: `Copywriting for onboarding communications, guides, or forms.
Photography, branding, or media production.
More than 5 onboarding stages or steps.
Advanced CRM automation or multi-branch conditional logic workflows.
Payment collection or contract signing functionality (quoted separately).
Custom-coded portals or bespoke application development.
Ongoing management or maintenance.
Legal documentation or compliance advisory.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional onboarding stages beyond 5.
Copywriting or content creation.
Payment collection or contract signing.
Advanced CRM automation or multi-branch logic.
Custom-coded portal development.
Additional integrations beyond those specified.
Ongoing management or administration.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  },

  'client-os': {
    label: 'Client Operating System',
    group: 'Standalone Services',
    title: 'Client Operating System — Scope of Work',

    deliverables: `Discovery & Operations Mapping session (90 minutes)
Client Operating System design — up to 4 core operational modules

Module 1 — Client & Contact Management
Structured workspace for managing client records, contact information, and relationship history.

Module 2 — Project & Task Management
Framework for tracking active projects, tasks, ownership, priorities, and delivery status.

Module 3 — Document, Asset & Resource Management
Centralised structure for organising files, documents, SOPs, and business assets.

Module 4 — Internal Communication & Status Tracking
System for team communication, status updates, and operational visibility.

Platform configuration and setup on the agreed platform
Standard operating procedure (SOP) documentation for each module
Team onboarding guide
OPS handover documentation`,

    milestones: `Milestone 1 — Discovery & Mapping (Week 1)
Operational audit, platform decision, module priorities confirmed, scope sign-off.

Milestone 2 — Architecture Design (Week 2)
Module structure and information flow design presented for review. Approval required before build.

Milestone 3 — Build: Modules 1 & 2 (Week 3–4)
Client management and project management modules built, configured, and reviewed.

Milestone 4 — Build: Modules 3 & 4 (Week 5–6)
Document management and communication/status modules built and configured.

Milestone 5 — Review & Refinement (Week 7)
Complete system review. Adjustments incorporated. SOP documentation delivered for review.

Milestone 6 — Handover & Activation (Week 8)
Handover session completed. Team guide delivered. System confirmed active.`,

    timeline: `Estimated delivery: 7–8 weeks from signed agreement and completion of the Discovery session.

Timeline is contingent on:
- Operational mapping completed and confirmed before the Build phase
- Access to existing tools or platforms provided in Week 1
- Client team participation in the handover session
- Review responses within 3 business days at each milestone

Post-handover: Internal team adoption and ongoing system management are the client's responsibility.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Map existing operational processes before the Discovery session.
Confirm module priorities and information requirements.
Designate a team member responsible for internal adoption and ongoing system management.
Provide access to current tools or platforms being replaced or integrated.
Respond to OPS review requests within 3 business days.
Participate in the handover session.
Manage internal team adoption following handover.

OPS RESPONSIBILITIES
Lead discovery and operational mapping.
Design and configure all agreed modules on the selected platform.
Build SOP documentation for each module.
Conduct end-to-end testing of all operational flows and structures.
Deliver the team onboarding guide and full handover documentation.
Facilitate the handover session.`,

    assumptions: `The client has selected or is willing to adopt OPS's recommended operations platform.
Operational processes are sufficiently defined to be mapped during the Discovery session.
No custom-coded or bespoke platform development is required — standard platform configuration only.
Internal team adoption and ongoing system management are the client's responsibility following handover.
The agreed scope of 4 modules will not expand without a formal Change Request.

REVISION LIMITS
Module design: 2 revision rounds per module.
SOP documentation: 1 revision round.
Post-handover changes are quoted separately.

THIRD-PARTY DEPENDENCIES
Operations platform: Notion, ClickUp, Monday.com, Airtable, or agreed equivalent (client account).
Integration platforms: as confirmed during Discovery.
Document storage: Google Drive, Dropbox, or equivalent (client account).

SUCCESS CRITERIA
All 4 operational modules live and functional on the selected platform.
SOP documentation delivered for each module.
Team onboarding guide delivered.
Handover session completed.
Client team able to independently operate and manage the system.`,

    exclusions: `Custom software development or bespoke application builds.
More than 4 operational modules within the base scope.
Advanced automation or multi-step workflow builds beyond standard platform capabilities.
Data migration from existing systems.
Training sessions beyond the handover documentation and session.
Ongoing system administration or management.
Legal documentation or compliance structuring.
Copywriting for SOPs or operational guides (SOP structure and framework only).
Photography or branding materials.
External integrations beyond those confirmed during Discovery.

OUT-OF-SCOPE WORK (requires separate quotation)
Additional modules beyond 4.
Custom software or bespoke application development.
Data migration from existing systems.
Advanced automation or multi-step workflow builds.
Ongoing management or administration.
Training sessions beyond handover documentation.
Additional integrations beyond those specified.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  },

  'digital-presence': {
    label: 'Digital Presence Management',
    group: 'Standalone Services',
    title: 'Digital Presence Management — Scope of Work',

    deliverables: `Monthly structured content updates (quantity defined by plan tier)
Website maintenance and technical health check
Performance monitoring and uptime verification
Minor text, image, or layout adjustments within the defined update framework
Proactive identification of technical issues or opportunities
Monthly performance and operations report delivered to the client`,

    milestones: `Monthly Operating Cycle

Week 1 — Content Assets Received
Client provides all content, copy, and media assets for the update cycle.

Week 2 — Updates Implemented
Updates executed, quality-checked, and verified on the live site.

Week 3 — Performance Monitoring
Technical health check and performance monitoring conducted.

Week 4 — Reporting
Monthly report compiled and delivered to the client.

This cycle repeats each month throughout the engagement.`,

    timeline: `Ongoing monthly service.

Minimum engagement: 3 months.
Notice period to terminate: 30 days written notice.

Content assets must be provided by the client at least 3 business days before each update cycle begins. Late asset delivery may delay the cycle to the following month.`,

    responsibilities: `CLIENT RESPONSIBILITIES
Supply all content, copy, and media assets for updates at least 3 business days before each update cycle.
Designate a point of contact for all monthly communications.
Review and respond to monthly reports within 5 business days.
Provide written approval for any updates that require sign-off.
Ensure domain and hosting accounts remain active and accessible throughout the engagement.
Notify OPS of any planned changes or external modifications to the digital infrastructure.

OPS RESPONSIBILITIES
Execute all agreed monthly updates within the defined framework.
Monitor site performance and uptime throughout the month.
Conduct monthly technical health check.
Deliver the monthly performance and operations report.
Flag technical issues, performance drops, or opportunities proactively.
Maintain professional communication standards and defined response times.`,

    assumptions: `Client-supplied content is provided in finalised form and within the agreed timeframe.
The digital infrastructure remains within OPS's operational control — no external modifications without OPS notification.
Platform accounts (domain, hosting, analytics) remain active and accessible throughout the engagement.
Monthly updates are limited to the defined update framework — new features or pages are out of scope.

REVISION LIMITS
Each update cycle: 1 round of revisions per update item.
Additional revision rounds outside the defined cycle are quoted separately.

THIRD-PARTY DEPENDENCIES
Hosting provider (client or OPS managed).
Domain registrar (client managed — must remain active).
Analytics platform (Google Analytics or agreed equivalent).
Any third-party platforms integrated with the site (client accounts — must remain accessible).

SUCCESS CRITERIA
All monthly updates implemented within each agreed cycle.
Performance monitoring conducted and reported each month.
Monthly report delivered on schedule.
Website maintained in a functional, performant, and professionally current state.
Client informed proactively of any issues or opportunities identified.`,

    exclusions: `New page design or development.
New feature development or system builds.
E-commerce or advanced functionality changes.
Custom integrations or platform migrations.
Copywriting or content creation — updates use client-supplied content only.
Photography or media production.
Paid advertising management or social media management.
Brand identity or design work.
Emergency support outside the agreed service framework.
Work that falls outside the defined monthly update scope.

OUT-OF-SCOPE WORK (requires separate quotation)
New page design or build.
New system features or functionality.
Emergency or urgent work outside the monthly cycle.
Copywriting or content creation.
Photography or media production.
Additional update cycles beyond the monthly allocation.
Custom integrations or platform migrations.
Ongoing social media management.

Any work requested outside the agreed scope requires a written Change Request, separate quotation, and client approval before implementation.`
  }

};

// Blueprint groups for UI rendering
const SOW_BLUEPRINT_GROUPS = [
  {
    label: 'Strategic Partnership Plans',
    keys: ['signature-plan', 'growth-plan', 'premium-plan']
  },
  {
    label: 'Standalone Services',
    keys: ['premium-website', 'online-booking', 'lead-capture', 'client-onboarding', 'client-os', 'digital-presence']
  }
];
