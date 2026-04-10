

## Plan: Generate OTOT Platform Architecture Document (DOCX)

### What
Generate a comprehensive architectural document covering the entire OTOT (One Tourist One Tree) platform — all portals, modules, database tables, edge functions, authentication flows, and integrations — as a downloadable Word document.

### Document Structure

**1. Executive Summary** — Platform mission, Kenya 15B trees initiative, MFC-ICLIP programme context

**2. Technology Stack** — React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL, Auth, Edge Functions, Storage), TanStack React Query, Recharts, Framer Motion, jsPDF, @react-pdf/renderer

**3. System Architecture Overview** — Client-side SPA with Supabase backend, auth contexts, role-based routing, layout system

**4. Authentication & Authorization**
- Supabase Auth (email/password, magic link, OAuth callback)
- Role system: super_admin, institutional_partner, business_partner, stakeholder, travel_agent, user (tourist)
- Route guards: ProtectedRoute, AdminRoute, SuperAdminRoute, InstitutionalRoute, StakeholderRoute, BusinessPartnerRoute, AgentRoute, LodgeRoute
- Auth contexts: AuthContext, LodgeAuthContext, AgentAuthContext
- Security functions: `get_user_role`, `has_role`, `is_super_admin`, `is_stakeholder`, `is_institutional_partner`, `stakeholder_has_module_permission`

**5. Portal Breakdown (6 portals)**

- **Tourist Portal** — Dashboard, CO2 Calculator, Carbon Calculator, My Trips, My Trees, My Impact, Tree Purchase, Profile, Certificates, Pledge pages
- **Super Admin Portal** — God Mode Overview, Users, Partners (Institutional/Business/Create), Stakeholders (All/Create/Module Assignment), Contribution Tracking, Tree Orders, Travel Agents, Agent Tickets, Access Control (Roles/Modules), Financial Transactions, Configuration (Wallet, Planting Costs, Contribution Tiers, Payment, Email, Feature Flags), API Management, Security, Audit Logs
- **Institutional (KTB) Portal** — Dashboard (CO2 Emissions chart), Recent Trips, Tree Orders, Travel Agents, Plantation Partners, Disbursements, Reports, Available Modules
- **Stakeholder (Plantation) Portal** — Climate Intelligence Dashboard (KPIs, National Mission, Monthly Progress, Status Pipeline, Beat Performance, Species, Nursery, Alerts, Activity Feeds), Tree Orders, Financial, Trip Management, Tree Operations (Planting/Monitoring/Tree Management/Community Impact), Forest Registry MDM (Locations/Nurseries/Species/Planters/Sequestration Rates), Analytics, Outcomes, Nurseries, Payments, Travel Agents, Settings
- **Lodge (Business Partner) Portal** — Dashboard, Tourist Assignments, My Trees, Plant Tree, Reimbursements, Performance, Notifications, Help
- **Travel Agent Portal** — Dashboard, Calculate & Offset, My Tickets, Reimbursements, Help

**6. Module Permission Framework** — Dynamic module assignment, access_type (shared/scoped), JSONB permissions (read/write/edit/delete), `useModulePermissions` hook, dynamic sidebar provisioning

**7. Database Schema** — All 57+ tables documented with purpose: activity_logs, agent_tickets, api_keys, auth_logs, carbon_offset_calculations, certificates, community_impact, contribution_tracking, trees, trips, organizations, modules, organization_modules, user_roles, planting_cost_configs/submissions, tree_planting_assignments, tree_status_transitions, tree_survival_records, MDM tables (locations hierarchy, species, nurseries, planters, sequestration rates), etc.

**8. Edge Functions** — 11 Deno functions: create-agent-user, create-lodge-user, create-stakeholder-user, deeplink-create/validate, delete-user, lodge-update-tree, magic-link-send/verify, reset-ktb-password, set-password

**9. Key Features** — CO2 calculation (ICAO standard, 22 kg/tree/year), planting cost lifecycle (submission/review/approval), contribution tiers, certificate generation (Pledge + Tree Plantation PDFs), tree status pipeline (10 stages), forest location hierarchy (County > Sub-county > Station > Block > Beat), invoice/receipt generation

**10. Public Pages** — Landing, Pledge (3 variants), CO2 Calculator

### Technical Approach

- Use `docx` npm library to generate a professionally formatted .docx
- Arial font, Heading styles, tables for schema and route listings
- Color-coded portal sections
- Output to `/mnt/documents/OTOT_Platform_Architecture.docx`
- QA via LibreOffice PDF conversion and page inspection

### Estimated Output
- ~20-25 pages covering all portals, modules, database, and architecture
- Single script execution, no codebase modifications

