// The parts of the API responses the screens use. Money is always in cents.

export type ResultState = "confirmed" | "needs_answer" | "cant_determine";

export type Deductible = {
  state: ResultState;
  percent: number | null;
  deductible_cents: number | null;
  rule_id: string;
  check_status: string;
};

export type OpenItem =
  | { kind: "question"; transaction_id: string; merchant: string; date: string; amount_cents: number; question: string }
  | { kind: "missing_w9"; contractor_id: string; name: string; paid_cents: number; cents_to_line: number; w9_requested: boolean }
  | { kind: "de542_unclear"; names: string[]; count: number };

export type Flagged = {
  kind: "hidden_instruction" | "unreadable_total";
  merchant: string;
  date: string | null;
  state: ResultState;
  image: string | null;
};

export type Deadline = { rule_id: string; date: string; days_until: number; plain_words: string };

export type PurchaseInput = {
  price_each_cents: number;
  quantity: number;
  in_use_by: string;
  sales_tax_percent: string;
  shipping_each_cents: number;
  year: number;
};

// The company's own California tax on its expected profit (S corporations only).
export type TaxOnProfit = {
  profit_cents: number;
  california_tax_cents: number;
  rate_basis_points: number;
  minimum_cents: number;
  approved: boolean;
  with_purchase: { written_off_cents: number; california_tax_cents: number; change_cents: number } | null;
};

export type PurchaseResult = {
  price_each_cents: number;
  quantity: number;
  total_cents: number;
  in_use_by: string;
  in_use_in_time: boolean;
  deadline: string;
  small_item: { line_cents: number; qualifies: boolean; election_made: boolean; over_line_cents: number; under_line_cents: number };
  california_room_before_cents: number;
  california_room_after_cents: number;
  federal: { this_year_cents: number; later_cents: number; how: string };
  california: { this_year_cents: number; later_cents: number; how: string };
  state: ResultState;
  ruleset_version: string;
  tax_on_profit: TaxOnProfit | null;
};

// One contractor's standing against the federal 1099 line.
export type ContractorStatus = {
  id: string;
  name: string;
  paid_cents: number;
  w9_on_file: boolean;
  federal_1099: string;
  cents_to_line: number;
  near_line: boolean;
};

export type Overview = {
  company: string;
  as_of: string;
  ruleset_version: string;
  is_demo: boolean;
  clock: { days_in_year: number; days_gone: number; days_left: number; day_of_year: number; percent_gone: number; tax_year: number };
  deadlines: Deadline[];
  california_equipment: { limit_cents: number; cap_cents: number; used_cents: number; room_cents: number };
  federal_equipment: { bought_cents: number; written_off_this_year_cents: number };
  contractors: {
    line_cents: number;
    old_line_cents: number | null;
    forms_needed: number;
    forms_under_old_line: number | null;
    missing_w9: string[];
    de542_unclear: string[];
    contractors: ContractorStatus[];
  };
  meals: { rows: { category: string; spent_cents: number; federal: Deductible; california: Deductible }[] };
  research: {
    rows: {
      where: "us" | "offshore";
      spent_cents: number;
      federal: { treatment: string; years: number | null; this_year_cents: number; later_cents: number };
      california: { treatment: string; this_year_cents: number; later_cents: number };
    }[];
  };
  open_items: OpenItem[];
  w9_received: string[]; // contractor ids marked received in this copy
  tax_on_profit: TaxOnProfit | null;
  flagged: Flagged[];
  receipts_filed: number;
  packet_purchases: { input: PurchaseInput; result: PurchaseResult }[];
};

export type QuestionOption = {
  category: string;
  label: string;
  outcome: { federal: Deductible; california: Deductible } | null;
};

export type Question = {
  transaction_id: string;
  date: string;
  merchant: string;
  amount_cents: number;
  question: string;
  status: ResultState;
  category: string;
  options: QuestionOption[];
  image: string | null;
  ruleset_version: string;
};

export type Rule = {
  id: string;
  jurisdiction: "federal" | "california" | "both";
  topic: string;
  plain_words: string;
  source: { cite: string; url: string | null };
  check_status: "checked" | "needs_check";
  approved_by: string | null;
  approved_on: string | null;
  note?: string;
  percent?: number | null;
  limit_cents?: number;
  phaseout_start_cents?: number;
  threshold_cents?: number;
  per_item_limit_cents?: number;
  treatment?: string;
  years?: number;
  rate_basis_points?: number;
  minimum_cents?: number;
  demo_change?: string;  // like "$25,000 → $30,000", only on a rule changed in this demo
  deadline?: string;
};

export type RuleChange = {
  rule_id: string;
  field: string | null;
  before: unknown;
  after: unknown;
  kind: "changed" | "added";
  plain_words?: string;
  source: { cite: string; url: string | null };
};

export type Comparison = {
  from_version: string;
  to_version: string;
  rule_changes: RuleChange[];
  forms_needed: { before: number; after: number };
  team_meals_federal_deductible: { before: number; after: number };
};

export type RuleUpdate = {
  id: string;
  year: number;
  rule_id: string;
  field: string;
  plain_words: string;
  from_text: string;
  to_text: string;
  quote: string;
  source: { cite: string; url: string; file: string };
  proposed_by: string;
  proposed_on: string;
  status: "proposed" | "approved" | "rejected";
  decided_by: string | null;
  decided_on: string | null;
  outcome: "changed" | "already_matches" | null;
  ruleset_version: string | null;
};

export type DemoProposal = {
  id: string;
  rule_id: string;
  field: string;
  plain_words: string;
  from_text: string;
  to_text: string;
  figure: string;
  quote: string;
  reason: string;
  source: { cite: string; url: string | null };
  status: "proposed" | "approved" | "rejected" | "undone";
  decided_by: string | null;
  decided_on: string | null;
  outcome?: "changed" | "already_matches";
};

export type ProposalResult = {
  proposals: DemoProposal[];
  rejected: { rule_id: string; field: string; figure: string; why: string }[];
  note: string;
  instructions_found: boolean;
  failed: boolean;
};

export type WorkspaceRules = {
  version: string;
  tax_year: number;
  rules: Rule[];
  demo_changes: DemoProposal[];
};
