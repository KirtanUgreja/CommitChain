import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#22c55e]">
          Ethereum accountability
        </p>
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-6xl">
          Lock ETH. Keep your word. Or lose it — for real.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          The only accountability tool where the penalty is genuinely
          inescapable.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="rounded-md bg-[#22c55e] px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-[#16a34a]"
          >
            Create Commitment
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-[#22c55e]/70 hover:bg-white/5"
          >
            View My Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
