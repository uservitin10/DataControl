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
      >
        <path d="M12 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`gov-button-secondary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
