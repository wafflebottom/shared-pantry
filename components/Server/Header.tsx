import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import RenameListTitle from "@/components/Client/RenameListTitle";
import ListNavDrawer from "@/components/Client/ListNavDrawer";
import ProfileSwitcher from "@/components/Client/ProfileSwitcher";
import { PROFILE_COOKIE, getProfiles } from "@/lib/profiles";
import { formatPrice } from "@/lib/price-book";

type Props = {
    isListPage?: boolean,
    isFullListPage?: boolean,
    listTileID?: number,
    listStore?: string,
    lists: { id: number; store: string }[],
    estimatedTotal?: number,
    pricedCount?: number,
    itemCount?: number,
}

function CostCard({ estimatedTotal, pricedCount, itemCount }: { estimatedTotal: number; pricedCount: number; itemCount: number }) {
    return (
        <div className="min-w-40 rounded-[11px] bg-ck-total px-3 py-1.5">
            <span className="flex items-baseline justify-between gap-3 whitespace-nowrap leading-tight">
                <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-ck-ink/75">Total</span>
                <span className="font-mono text-[15px] font-bold text-ck-ink">
                    {pricedCount > 0 ? formatPrice(estimatedTotal) : "—"}
                </span>
            </span>
            <span className="block text-right font-sans text-[9px] font-semibold leading-tight text-ck-ink/75">
                {pricedCount} of {itemCount} priced
            </span>
        </div>
    )
}

export default async function Header ({ isListPage = false, isFullListPage = false, listTileID, listStore, lists, estimatedTotal, pricedCount, itemCount }: Props) {
    const showCost =
        estimatedTotal !== undefined &&
        pricedCount !== undefined &&
        itemCount !== undefined &&
        itemCount > 0

    // The device's identity lives in the Header, so every page gets it.
    // One profile query per render: the current profile is found in the
    // list instead of fetching the profiles a second time.
    const profiles = await getProfiles()
    const jar = await cookies()
    const currentId = Number(jar.get(PROFILE_COOKIE)?.value)
    const currentProfile = (currentId ? profiles.find((p) => p.id === currentId) : undefined) ?? null

    return (
        <div className="fixed left-0 top-0 z-10 w-full border-b border-ck-border bg-ck-surface pb-2 pt-3 font-sans text-sm sm:pb-3 sm:pt-8 lg:left-56 lg:w-[calc(100%-14rem)]">
            <div className="flex items-center gap-4 px-2">
                <div className="flex shrink-0 items-center gap-2">
                    <ListNavDrawer lists={lists} currentListID={listTileID} currentFullList={isFullListPage} />
                    <Link href="/" className="flex items-center gap-2 lg:hidden">
                        <Image src="/icon.svg" alt="Shared Pantry" width={36} height={36} className="h-9 w-9 shrink-0" />
                        <span className="flex flex-col gap-px whitespace-nowrap leading-none">
                            <p className="font-serif text-[16px] text-ck-ink">Shared</p>
                            <p className="font-sans text-[15px] font-extrabold tracking-tight text-ck-ink">Pantry</p>
                        </span>
                    </Link>
                    <span aria-hidden className="hidden h-[38px] w-[1.5px] shrink-0 rounded-full bg-ck-ink/30 sm:block lg:hidden" />
                </div>

                {isListPage && listTileID !== undefined ?
                <div className="flex flex-1 justify-center">
                    <RenameListTitle id={listTileID} store={listStore ?? ""} />
                </div> : isFullListPage ?
                <div className="flex flex-1 justify-center">
                    <span className="font-serif text-[26px] text-ck-ink sm:text-[28px]">Full List</span>
                </div> : <div className="flex-1" />}

                <div className="flex shrink-0 items-center justify-end gap-2">
                    {showCost && (
                        <div className="portrait:hidden">
                            <CostCard estimatedTotal={estimatedTotal} pricedCount={pricedCount} itemCount={itemCount} />
                        </div>
                    )}
                    <ProfileSwitcher profiles={profiles} currentProfile={currentProfile} />
                </div>
            </div>

            {showCost && (
                <div className="mt-2 hidden justify-center portrait:flex">
                    <CostCard estimatedTotal={estimatedTotal} pricedCount={pricedCount} itemCount={itemCount} />
                </div>
            )}
        </div>
    )
}
