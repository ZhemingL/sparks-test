interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

const SectionHeader = ({ title, subtitle, centered = true }: SectionHeaderProps) => {
  return (
    <div className={`mb-10 ${centered ? "text-center" : ""}`}>
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
      )}
      <div className={`mt-4 h-1 w-16 rounded-full bg-primary ${centered ? "mx-auto" : ""}`} />
    </div>
  );
};

export default SectionHeader;
