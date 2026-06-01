type SectionHeaderProps = {
  title: string;
  description?: string;
  titleClassName?: string;
  descClassName?: string;
};

export default function SectionHeader({
  title,
  description,
  titleClassName,
  descClassName,
}: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className={`text-3xl font-bold tracking-tight text-stone-950 ${titleClassName ?? ""}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-2 max-w-2xl text-stone-700 leading-relaxed ${descClassName ?? ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}