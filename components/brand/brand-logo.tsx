import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logos/JA_logo_black_text.png";

type BrandLogoTone = "blue" | "navy" | "white" | "black";

const TONE_COLOR: Record<Exclude<BrandLogoTone, "black">, string> = {
  blue: "#0070F3",
  navy: "#1f2353",
  white: "#ffffff",
};

/**
 * Wordmark from the black PNG. Coloured tones use a CSS mask so we can
 * recolour without shipping extra assets.
 */
export function BrandLogo({
  tone = "blue",
  className,
  priority = false,
  align = "left",
}: {
  tone?: BrandLogoTone;
  className?: string;
  priority?: boolean;
  align?: "left" | "center";
}) {
  const position = align === "center" ? "center" : "left center";

  if (tone === "black") {
    return (
      <Image
        src={LOGO_SRC}
        alt="JA Group"
        width={200}
        height={40}
        priority={priority}
        className={cn(
          "h-8 w-auto object-contain",
          align === "center" ? "object-center" : "object-left",
          className,
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label="JA Group"
      className={cn("inline-block h-8 w-[168px]", className)}
      style={{
        backgroundColor: TONE_COLOR[tone],
        maskImage: `url(${LOGO_SRC})`,
        WebkitMaskImage: `url(${LOGO_SRC})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: position,
        WebkitMaskPosition: position,
      }}
    />
  );
}
