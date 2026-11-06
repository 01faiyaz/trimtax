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
};

export type Overview = {
  company: string;
  as_of: string;
  ruleset_version: string;
  is_demo: boolean;
  clock: { days_in_year: number; days_gone: number; days_left: number; day_of_year: number; percent_gone: number; tax_year: number };
  deadlines: Deadline[];
  california_equipment: { limit_cents: number; used_cents: number; room_cents: number };
  federal_equipment: { bought_cents: number; written_off_this_year_cents: number };
  contractors: {
    line_cents: number;
    old_line_cents: number | null;
    forms_needed: number;
    forms_under_old_line: number | null;
    missing_w9: string[];
    de542_unclear: string[];
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
