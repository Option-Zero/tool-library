import type { CategoryCount } from "~/types/tool";

interface CategoryPillsProps {
  categories: CategoryCount[];
  active: string | undefined;
  onSelect: (category: string | undefined) => void;
}

export default function CategoryPills({
  categories,
  active,
  onSelect,
}: CategoryPillsProps) {
  if (categories.length === 0) return null;

  return (
    <div className="category-pills" role="listbox" aria-label="Filter by category">
      <button
        type="button"
        className={`pill ${active === undefined ? "pill-active" : ""}`}
        onClick={() => onSelect(undefined)}
        role="option"
        aria-selected={active === undefined}
      >
        All
      </button>
      {categories.map(({ category, count }) => (
        <button
          key={category}
          type="button"
          className={`pill ${active === category ? "pill-active" : ""}`}
          onClick={() => onSelect(active === category ? undefined : category)}
          role="option"
          aria-selected={active === category}
        >
          {category} ({count})
        </button>
      ))}
    </div>
  );
}
