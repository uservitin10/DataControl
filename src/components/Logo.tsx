import Image from "next/image";

type LogoProps = {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export function Logo({
  className,
  width = 40,
  height = 40,
  alt = "Horús",
}: LogoProps) {
  if (className) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src="/LogoDataControl.png"
          alt={alt}
          fill
          sizes="40px"
          style={{ objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <Image
      src="/LogoDataControl.png"
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
