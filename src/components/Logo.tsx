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
  alt = "Data Control",
}: LogoProps) {
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
