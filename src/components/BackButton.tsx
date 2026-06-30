import Link from "next/link";

type BackButtonProps = {
  onClick?: () => void;
  href?: string;
  label?: string;
  className?: string;
};

export function BackButton({ onClick, href, label = "Voltar", className = "" }: BackButtonProps) {
  const content = (
    <>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </>
  );

  const baseClass = `gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={label} title={label} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass} aria-label={label} title={label}>
      {content}
    </button>
  );
}
