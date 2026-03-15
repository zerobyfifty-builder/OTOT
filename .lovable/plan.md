

## Updated Travel Agent Module Plan

The key change is adding a **Ticket Information step** before the carbon calculator. When a travel agent wants to offset carbon for a booked ticket, they must first fill in ticket details, then proceed to the carbon calculator.

---

### Updated Agent Flow

```text
Agent Login → Dashboard → "Calculate & Offset" →
  Step 1: Ticket Details Form (Staff Name, PNR No, Ticket No, Date of Issue, LPO No)
  Step 2: Carbon Calculator (reusing existing logic)
  Step 3: Results + Pay/Save
```

### Database: `agent_tickets` Table Update

The `agent_tickets` table (from the original plan) now includes these additional required fields:

| Column | Type | Required |
|---|---|---|
| `staff_name` | text | Yes |
| `pnr_number` | text | Yes |
| `ticket_number` | text | Yes |
| `ticket_issue_date` | date | Yes |
| `lpo_number` | text | Yes |
| `department` | text | Yes (default: 'KTB') |

These fields are captured **before** the carbon calculation step.

### UI: `AgentCalculateOffset.tsx` - Multi-Step Form

**Step 1 - Ticket Details** (new gate-keeping step):
- Form fields: Staff Name, PNR No, Ticket No, Date of Ticket Issue, LPO No, Department
- All fields required with zod validation
- "Next" button proceeds to Step 2 only when all fields are valid

**Step 2 - Carbon Calculator**:
- Reuses the existing carbon calculation logic (emission factors, airport distance formulas, accommodation) from `CarbonCalculator.tsx`
- Extracts the calculation utilities into a shared helper or duplicates the relevant constants/functions
- Pre-fills origin/destination airports and dates where applicable

**Step 3 - Results & Payment**:
- Shows CO2 breakdown and trees needed
- Options: "Pay & Plant Trees" or "Save for Later"
- On save/pay: inserts into `agent_tickets` with all ticket details + emission data

### No Changes to Existing Features

- The existing `CarbonCalculator.tsx` page remains untouched for tourist users
- Lodge portal, admin modules, and all other features are unaffected
- The travel agent module is fully isolated with its own auth context, routes, and pages

### Everything Else From the Original Plan Remains

- Database tables: `travel_agents`, `travel_agent_sessions`, `agent_tickets`
- Auth: `AgentAuthContext`, `AgentRoute`, `AgentLogin`
- Admin pages: `TravelAgentsManagement`, `AgentTicketsOverview`
- Agent pages: Dashboard, Tickets table with 3-dot actions (invoice/receipt download), Reimbursements
- Edge function: `create-agent-user` for admin-created accounts with invitation email

