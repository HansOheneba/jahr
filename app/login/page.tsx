import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/brand/brand-logo";

const NAVY = "#1f2353";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="relative hidden w-[46%] overflow-hidden p-4 lg:block xl:w-[48%]">
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl text-white">
          <Image
            src="/login/hero.jpg"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${NAVY}cc 0%, ${NAVY}66 42%, ${NAVY}e6 100%)`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-end px-8 py-10 xl:px-12">
            <div className="max-w-md space-y-3">
              <p className="text-xs font-medium tracking-[0.14em] text-white/75 uppercase">
                JA Group
              </p>
              <h1 className="text-3xl font-medium tracking-tight xl:text-4xl">
                JA Group TMS
              </h1>
              <div className="h-px w-14 bg-white/50" />
              <p className="text-sm leading-relaxed text-white/85 xl:text-base">
                Leave, documents, payroll, and your team in one place for
                everyone at JA Group.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-5 lg:space-y-6">
            <BrandLogo
              tone="navy"
              className="h-8 w-[180px] lg:h-9 lg:w-[200px]"
              priority
            />
            <div className="space-y-1.5">
              <h2 className="text-2xl font-medium tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in with your work email.
              </p>
            </div>
          </div>

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
