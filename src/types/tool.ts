export interface Tool {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: string | null;
  photo_url: string | null;
  status: "available" | "checked_out" | "disabled";
  created_at: string;
  updated_at: string;
}

export interface ToolWithOwner extends Tool {
  owner_name: string;
}

export interface ToolWithLoan extends ToolWithOwner {
  borrower_id: string | null;
  borrower_name: string | null;
  expected_return: string | null;
  borrowed_at: string | null;
}

export interface ToolListResult {
  tools: ToolWithLoan[];
  total: number;
  categories: CategoryCount[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface ToolDetailResult {
  tool: ToolWithLoan;
}
