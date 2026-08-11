import type { ReactNode } from "react";

type PageHeroProps = {
  title: ReactNode;
  description: ReactNode;
  eyebrow?: ReactNode;
  align?: "left" | "center";
  children?: ReactNode;
  sectionClassName?: string;
  containerClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

const PageHero = ({
  title,
  description,
  eyebrow,
  align = "left",
  children,
  sectionClassName = "",
  containerClassName = "",
  contentClassName = "",
  titleClassName = "",
  descriptionClassName = "",
}: PageHeroProps) => {
  const centered = align === "center";

  return (
    <section className={`hero-gradient relative overflow-hidden py-8 sm:py-10 md:py-16 lg:py-20 ${sectionClassName}`.trim()}>
      <div className={`container mx-auto max-w-6xl px-4 sm:px-6 ${containerClassName}`.trim()}>
        <div className={`${centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} space-y-2 ${contentClassName}`.trim()}>
          {eyebrow ? <div className={centered ? "flex justify-center" : "flex justify-start"}>{eyebrow}</div> : null}
          <h1
            className={`text-[1.65rem] leading-tight sm:text-3xl md:text-4xl font-bold text-secondary-foreground ${titleClassName}`.trim()}
          >
            {title}
          </h1>
          <p
            className={`max-w-xl text-sm leading-relaxed text-secondary-foreground/75 sm:text-base md:max-w-2xl ${descriptionClassName}`.trim()}
          >
            {description}
          </p>
          {children ? <div>{children}</div> : null}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
