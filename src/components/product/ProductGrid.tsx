import { cn } from "@/lib/format";
import { ProductCard, type ProductCardProps } from "./ProductCard";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

export function ProductGrid({ products, className, priorityCount = 4, animated = false }: { products: ProductCardProps["product"][]; className?: string; priorityCount?: number; animated?: boolean }) {
  const grid = cn("grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4", className);
  if (animated) {
    return (
      <RevealGroup className={grid} stagger={0.05}>
        {products.map((p, i) => (
          <RevealItem key={p.id} className="flex">
            <ProductCard product={p} priority={i < priorityCount} className="w-full" />
          </RevealItem>
        ))}
      </RevealGroup>
    );
  }
  return (
    <div className={grid}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
