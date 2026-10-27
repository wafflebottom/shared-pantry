import RequestNewListTile from "@/components/Client/RequestNewListTile";
import RequestNewListLine from "@/components/Client/RequestNewListLine";
import DeleteButton from "@/components/Client/DeleteButton";

type Props = {
    bis_list_page?: boolean,
    listTileID?: number,
}

export default function Footer({ bis_list_page = false, listTileID }: Props) {
    return (
        <footer className="fixed bottom-0 left-0 h-24 w-full bg-linear-to-t from-ck-bg lg:left-56 lg:w-[calc(100%-14rem)]">
            <div className="flex h-full items-center justify-center gap-6 text-ck-ink [&_svg]:h-6 [&_svg]:w-6">
                {bis_list_page ? (
                    <>
                        <RequestNewListLine listTileID={listTileID ?? 0} />
                        <DeleteButton listTileID={listTileID} />
                    </>
                ) : (
                    <RequestNewListTile />
                )}
            </div>
        </footer>
    )
}
