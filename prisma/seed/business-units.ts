// The business units and teams to seed. "default" is about 200 people in 3 BUs; "large"
// adds 3 more for about 1,000 people (for the grid performance check, T19).
import { db } from "@/server/db";

export type SeedSize = "default" | "large";

type BusinessUnitPlan = {
  name: string;
  hidden: boolean;
  people: number;
  unassigned: number;
  teams: string[];
};

const DEFAULT_UNITS: BusinessUnitPlan[] = [
  {
    name: "West Operations",
    hidden: false,
    people: 50,
    unassigned: 2,
    teams: [
      "Service Design",
      "Data & Insight",
      "Finance Operations",
      "Customer Support",
      "Commercial",
      "Estates & Facilities",
      "People & Culture",
    ],
  },
  {
    name: "North Finance",
    hidden: false,
    people: 80,
    unassigned: 2,
    teams: [
      "Accounts Payable",
      "Accounts Receivable",
      "Payroll",
      "Treasury",
      "Financial Planning",
      "Audit & Assurance",
      "Procurement",
      "Tax",
      "Systems & Reporting",
    ],
  },
  {
    name: "Corporate Services",
    hidden: true,
    people: 70,
    unassigned: 1,
    teams: [
      "Legal",
      "Communications",
      "IT Service Desk",
      "Information Governance",
      "Health & Safety",
      "Executive Office",
      "Learning & Development",
      "Records Management",
    ],
  },
];

const LARGE_TEAM_NAMES = [
  "Planning",
  "Delivery",
  "Operations Support",
  "Quality",
  "Analytics",
  "Engineering",
  "Programme Office",
  "Business Support",
  "Contracts",
  "Customer Experience",
  "Policy",
  "Workforce",
];

const LARGE_EXTRA_UNITS: BusinessUnitPlan[] = [
  { name: "South Health", hidden: false, people: 300, unassigned: 3, teams: LARGE_TEAM_NAMES },
  {
    name: "East Infrastructure",
    hidden: false,
    people: 250,
    unassigned: 2,
    teams: LARGE_TEAM_NAMES.slice(0, 10),
  },
  {
    name: "Central Digital",
    hidden: false,
    people: 250,
    unassigned: 2,
    teams: LARGE_TEAM_NAMES.slice(0, 10),
  },
];

export type SeededBusinessUnit = {
  id: string;
  name: string;
  people: number;
  unassigned: number;
  teams: { id: string; name: string }[];
};

export async function createBusinessUnits(size: SeedSize): Promise<SeededBusinessUnit[]> {
  const plans = size === "large" ? [...DEFAULT_UNITS, ...LARGE_EXTRA_UNITS] : DEFAULT_UNITS;
  const seeded: SeededBusinessUnit[] = [];

  for (const plan of plans) {
    const slug = plan.name.toLowerCase().replaceAll(" ", "-");
    const unit = await db.businessUnit.create({
      data: { name: plan.name, slug, hidden: plan.hidden },
    });
    const teams = [];
    for (const [index, name] of plan.teams.entries()) {
      teams.push(
        await db.team.create({ data: { businessUnitId: unit.id, name, sortOrder: index + 1 } }),
      );
    }
    seeded.push({ ...plan, id: unit.id, teams });
  }
  return seeded;
}
