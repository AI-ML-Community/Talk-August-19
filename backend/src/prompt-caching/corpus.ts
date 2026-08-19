const POLICY_SECTIONS = [
    {
        title: "Refund Eligibility",
        body: "Customers may request a full refund within 30 calendar days of the original purchase date, provided the subscription has not exceeded 20 percent of its included usage quota. Refunds requested between day 31 and day 60 are issued as account credit rather than a return to the original payment method. Enterprise agreements signed under a custom master services agreement supersede this policy and are handled by the assigned account manager. Refunds are never issued for add-on usage that has already been consumed, including overage tokens, additional seats provisioned mid-cycle, or one-time professional services engagements.",
    },
    {
        title: "Billing Cycles and Proration",
        body: "Subscriptions renew automatically on the anniversary of the activation date. When a customer upgrades mid-cycle, the new plan is prorated against the unused portion of the current cycle and the difference is charged immediately. Downgrades take effect at the start of the next billing cycle and never generate an immediate refund. Annual plans are billed in a single upfront charge and carry a 15 percent discount relative to the monthly equivalent. Failed payment attempts trigger three automatic retries spaced 72 hours apart before the account enters a suspended state.",
    },
    {
        title: "Seat Management",
        body: "Workspace owners and administrators may add or remove seats at any time. Adding a seat provisions immediately and is prorated for the remainder of the cycle. Removing a seat releases the license at the end of the cycle, and the seat remains usable until then. A workspace must retain at least one owner at all times; attempts to remove the final owner are rejected. Seats that have been inactive for more than 90 consecutive days are flagged in the monthly administrative digest but are never automatically reclaimed.",
    },
    {
        title: "Data Retention",
        body: "Conversation transcripts are retained for 30 days on the standard tier and 90 days on the business tier. Enterprise customers may configure retention between 1 and 365 days, or enable zero data retention, in which case transcripts are discarded immediately after the response is delivered. Deleted workspaces enter a 14 day soft-delete window during which an owner may restore them. After that window, all associated records are purged from primary storage and removed from backups within a further 35 days.",
    },
    {
        title: "Rate Limits and Overage",
        body: "Each plan carries a requests-per-minute ceiling and a monthly token allowance. Exceeding the per-minute ceiling returns a 429 response with a retry-after header; these requests are not billed. Exceeding the monthly token allowance does not block requests on paid plans. Instead, overage accrues at the published per-token overage rate and appears as a separate line item on the following invoice. Free tier accounts are hard-stopped at the allowance boundary and receive a 403 until the next cycle begins.",
    },
    {
        title: "Service Credits",
        body: "If monthly uptime falls below 99.9 percent, affected customers are eligible for service credits calculated as a percentage of that month's subscription fee. Uptime between 99.0 and 99.9 percent yields a 10 percent credit. Uptime between 95.0 and 99.0 percent yields a 25 percent credit. Uptime below 95.0 percent yields a 50 percent credit. Credits must be requested within 30 days of the incident and are applied to the next invoice. Scheduled maintenance announced at least 72 hours in advance is excluded from uptime calculations.",
    },
    {
        title: "Account Security",
        body: "Multi-factor authentication is optional on the standard tier and mandatory for all administrators on the business and enterprise tiers. Single sign-on via SAML is available on enterprise plans and, once enforced, disables password-based login for all members of the workspace. API keys are scoped to a single workspace and may be restricted to specific endpoints. A leaked key should be revoked immediately from the console; revocation takes effect within 60 seconds globally. Session tokens expire after 14 days of inactivity.",
    },
    {
        title: "Support Response Targets",
        body: "Standard tier support responds to tickets within two business days. Business tier responds within eight business hours for normal issues and four hours for issues marked as production-impacting. Enterprise customers with a premium support attachment receive a one hour response target on critical incidents, twenty-four hours a day, and are assigned a named technical account manager. Response targets describe time to first human response, not time to resolution.",
    },
    {
        title: "Acceptable Use",
        body: "Customers may not use the service to generate content that violates applicable law, to attempt to reverse engineer model weights, or to resell raw model access without a written reseller agreement. Automated scraping of the console or documentation is prohibited. Load testing against production endpoints requires prior written approval and a scheduled window. Violations result in a written warning for first offenses, with repeated or severe violations leading to suspension and, ultimately, termination of the agreement.",
    },
    {
        title: "Cancellation",
        body: "A customer may cancel at any time from the billing settings page. Cancellation stops the next renewal but does not terminate the current cycle; access continues until the cycle ends. There is no partial refund for the unused remainder of a cancelled cycle except where required by applicable consumer protection law. Annual plans cancelled within the first 14 days of the initial term qualify for a full refund. Data export must be initiated before the access period ends, as exports are unavailable once the workspace is deactivated.",
    },
];

export const SUPPORT_SYSTEM_PROMPT = [
    "You are a customer support assistant for a SaaS company.",
    "Answer strictly from the policy handbook below. If the handbook does not cover the question, say so plainly and suggest contacting a human agent.",
    "Keep answers under 80 words. Cite the section title you relied on.",
    "",
    "=== POLICY HANDBOOK ===",
    ...POLICY_SECTIONS.map((section) => `\n## ${section.title}\n${section.body}`),
    "\n=== END POLICY HANDBOOK ===",
].join("\n");

export const SAMPLE_QUESTIONS = [
    "I bought an annual plan 10 days ago. Can I get my money back?",
    "We removed a teammate yesterday. Are we still paying for that seat?",
    "Our uptime last month was 98.4 percent. What are we owed?",
    "How long do you keep our chat transcripts on the business plan?",
    "What happens if we blow past our monthly token allowance?",
    "Someone leaked one of our API keys. How fast can we kill it?",
];
