import Link from "next/link";
import RenameListTitle from "../Client/RenameListTitle";
import ListNavDrawer from "../Client/ListNavDrawer";
import { formatPrice } from "@/lib/prices";

type Props = {
    bis_list_page?: boolean,
    listTileID?: number,
    listStore?: string,
    lists: { id: number; store: string }[],
    estimatedTotal?: number,
    pricedCount?: number,
    itemCount?: number,
}

function CostCard({ estimatedTotal, pricedCount, itemCount }: { estimatedTotal: number; pricedCount: number; itemCount: number }) {
    return (
        <div className="min-w-40 rounded-lg bg-white/80 px-3 py-1.5 ring-1 ring-rose-300">
            <span className="flex items-baseline justify-between gap-3 whitespace-nowrap font-sans leading-tight">
                <span className="text-sm font-medium text-neutral-500">Total</span>
                <span className="text-base font-bold text-rose-900">
                    {pricedCount > 0 ? formatPrice(estimatedTotal) : "—"}
                </span>
            </span>
            <span className="block text-right font-sans text-[11px] leading-tight text-neutral-500">
                {pricedCount} of {itemCount} priced
            </span>
        </div>
    )
}

export function Header ({ bis_list_page = false, listTileID, listStore, lists, estimatedTotal, pricedCount, itemCount }: Props) {
    const showCost =
        estimatedTotal !== undefined &&
        pricedCount !== undefined &&
        itemCount !== undefined &&
        itemCount > 0

    return (
        <div className="fixed left-0 top-0 z-10 w-full bg-linear-to-b from-rose-300 pb-2 pt-3 font-impact text-sm backdrop-blur-2xl sm:pb-3 sm:pt-8">
            <div className="flex items-center gap-4 px-2">
                <div className="flex shrink-0 items-center gap-2">
                    <ListNavDrawer lists={lists} currentListID={listTileID} />
                    <Link href="/">
                        <p className="font-sans text-rose-800">Shared</p>
                        <p className="font-mono font-bold text-rose-600 text-shadow-rose-900/20 text-shadow-lg">Pantry</p>
                    </Link>
                </div>

                {bis_list_page && listTileID !== undefined ?
                <div className="flex flex-1 justify-center">
                    <RenameListTitle id={listTileID} store={listStore ?? ""} />
                </div> : <div className="flex-1" />}

                <div className="flex shrink-0 justify-end">
                    {showCost && (
                        <div className="portrait:hidden">
                            <CostCard estimatedTotal={estimatedTotal} pricedCount={pricedCount} itemCount={itemCount} />
                        </div>
                    )}
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